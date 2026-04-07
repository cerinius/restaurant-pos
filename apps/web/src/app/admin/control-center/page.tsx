'use client';

import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';

export default function ControlCenterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ops-control-center'],
    queryFn: () => api.getOperationsOverview(),
  });

  const overview = data?.data;

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Multi-Location Control Center</h1>
        <p className="mt-1 text-sm text-slate-400">Benchmark live operations across locations using real order, reservation, task, and payroll export activity.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-400">Loading multi-location benchmarks...</div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-100">Location Benchmarks</h2>
            </div>
            <div className="divide-y divide-slate-800">
              {(overview?.multiLocation || []).map((location: any) => (
                <div key={location.locationId} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-100">{location.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {location.orderCount} orders today | {location.reservationCount} reservations today
                      </p>
                    </div>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-300">
                      {location.openTasks} open tasks
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orders</p>
                      <p className="mt-2 text-xl font-bold text-slate-100">{location.orderCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reservations</p>
                      <p className="mt-2 text-xl font-bold text-slate-100">{location.reservationCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payroll Batches</p>
                      <p className="mt-2 text-xl font-bold text-slate-100">{location.activePayrollBatches}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Forecast Alerts</h2>
              <div className="mt-4 space-y-3">
                {(overview?.forecast?.optimizationAlerts || []).map((alert: any) => (
                  <div key={`${alert.bucket}-${alert.covers}`} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                    <p className="text-sm font-semibold text-cyan-100">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold text-slate-100">Connected Apps</h2>
              <div className="mt-4 space-y-3">
                {(overview?.integrations?.connections || []).map((connection: any) => (
                  <div key={connection.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">{connection.displayName}</p>
                    <p className="mt-1 text-xs text-slate-400">{connection.app?.name} | {connection.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
