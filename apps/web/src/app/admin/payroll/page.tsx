'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const { locationId } = useAuthStore();
  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['ops-payroll-page', locationId, periodStart, periodEnd],
    queryFn: () => api.getOperationsOverview({ locationId }),
  });

  const payrollPreview = useQuery({
    queryKey: ['ops-payroll-preview', locationId, periodStart, periodEnd],
    queryFn: () => api.getPayrollPreview({ locationId, periodStart, periodEnd }),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.createPayrollExport({ locationId, periodStart, periodEnd, provider: 'csv' }),
    onSuccess: async () => {
      toast.success('Payroll export batch created');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ops-payroll-page'] }),
        qc.invalidateQueries({ queryKey: ['ops-payroll-preview'] }),
      ]);
    },
  });

  const createTipPoolMutation = useMutation({
    mutationFn: () =>
      api.createTipPool({
        locationId,
        shiftDate: new Date().toISOString(),
        name: 'Daily Tip Pool',
        totalTips: Number((payrollPreview.data?.data?.totals?.grossTips || 0).toFixed(2)),
        shares: (payrollPreview.data?.data?.rows || []).slice(0, 4).map((row: any) => ({
          userId: row.userId,
          role: row.role,
          points: row.role === 'SERVER' ? 1.5 : 1,
        })),
      }),
    onSuccess: async () => {
      toast.success('Tip pool created');
      await qc.invalidateQueries({ queryKey: ['ops-payroll-page'] });
    },
  });

  const overview = data?.data;
  const preview = payrollPreview.data?.data;

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Payroll and Tips</h1>
          <p className="mt-1 text-sm text-slate-400">Use actual clock events and order tips to build payroll exports, spot compliance issues, and manage tip pooling.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input" />
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input" />
          <button type="button" onClick={() => exportMutation.mutate()} className="btn-primary">
            Export Payroll
          </button>
        </div>
      </div>

      {isLoading || payrollPreview.isLoading ? (
        <div className="mt-6 text-sm text-slate-400">Loading payroll operations...</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Worked</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{formatHours(preview?.totals?.workedMinutes || 0)}</p>
            </div>
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Gross Tips</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{formatCurrency(preview?.totals?.grossTips || 0)}</p>
            </div>
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payroll Cost</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{formatCurrency(preview?.totals?.payrollCost || 0)}</p>
            </div>
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compliance Alerts</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{overview?.forecast?.complianceAlerts?.length || 0}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-100">Payroll Preview</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      {['Staff', 'Role', 'Regular', 'OT', 'Tips', 'Total Pay'].map((label) => (
                        <th key={label} className="px-4 py-3 text-left">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.rows || []).map((row: any) => (
                      <tr key={row.userId} className="border-t border-slate-800 text-slate-200">
                        <td className="px-4 py-3">{row.userName}</td>
                        <td className="px-4 py-3 text-slate-400">{row.role}</td>
                        <td className="px-4 py-3">{formatHours(row.regularMinutes)}</td>
                        <td className="px-4 py-3">{formatHours(row.overtimeMinutes)}</td>
                        <td className="px-4 py-3">{formatCurrency(row.grossTips)}</td>
                        <td className="px-4 py-3 font-semibold text-cyan-100">{formatCurrency(row.totalPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-slate-100">Labor Forecast</h2>
                <div className="mt-4 space-y-3">
                  {(overview?.forecast?.demandBuckets || []).map((bucket: any) => (
                    <div key={bucket.bucket} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-sm font-semibold text-slate-100">{bucket.bucket}</p>
                      <p className="mt-1 text-xs text-slate-400">{bucket.covers} forecast covers | {formatCurrency(bucket.projectedSales)} projected sales</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-100">Tip Pools</h2>
                  <button type="button" onClick={() => createTipPoolMutation.mutate()} className="btn-secondary">
                    Create Pool
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {(overview?.tipPools || []).map((pool: any) => (
                    <div key={pool.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-sm font-semibold text-slate-100">{pool.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(pool.shiftDate).toLocaleDateString()} | {formatCurrency(pool.totalTips)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-lg font-semibold text-slate-100">Compliance Alerts</h2>
                <div className="mt-4 space-y-3">
                  {(overview?.forecast?.complianceAlerts || []).map((alert: any) => (
                    <div key={`${alert.userId}-${alert.minutes}`} className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                      <p className="text-sm font-semibold text-amber-100">{alert.message}</p>
                      <p className="mt-1 text-xs text-amber-200/80">{formatHours(alert.minutes)} logged today</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
