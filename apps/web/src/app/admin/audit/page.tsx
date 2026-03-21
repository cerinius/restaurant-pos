
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const ACTION_COLORS: Record<string, string> = {
  LOGIN:             'text-blue-400',
  LOGOUT:            'text-slate-400',
  ORDER_CREATED:     'text-emerald-400',
  ORDER_FIRED:       'text-orange-400',
  ORDER_VOIDED:      'text-red-400',
  ITEM_VOIDED:       'text-red-300',
  DISCOUNT_APPLIED:  'text-amber-400',
  PAYMENT_PROCESSED: 'text-emerald-400',
  PAYMENT_REFUNDED:  'text-red-400',
  STAFF_CREATED:     'text-blue-400',
  STAFF_UPDATED:     'text-blue-300',
  PIN_RESET:         'text-purple-400',
  ITEM_86:           'text-red-400',
  ITEM_RESTORED:     'text-emerald-400',
};

export default function AuditPage() {
  const today   = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [action,   setAction]   = useState('');
  const [page,     setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', dateFrom, dateTo, action, page],
    queryFn: () => api.getAuditLogs({
      dateFrom, dateTo,
      action: action || undefined,
      page: String(page),
      limit: '50',
    }),
  });

  const logs: any[]      = data?.data       || [];
  const pagination: any  = data?.pagination || {};

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-950/50 shrink-0">
        <h1 className="text-xl font-bold text-slate-100 mb-3">Audit Log</h1>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="input text-sm py-1.5" />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="input text-sm py-1.5" />
          </div>
          <div>
            <label className="label text-xs">Action Filter</label>
            <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="input text-sm py-1.5" placeholder="e.g. VOID, LOGIN" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 sticky top-0 z-10">
            <tr>
              {['Time','User','Action','Entity','Details'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-500">No audit events for this period</td></tr>
            )}
            {logs.map((log: any) => (
              <tr key={log.id} className="border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                  <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                  <div className="text-slate-600">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                  {log.userName || 'â'}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={clsx('font-mono text-xs font-semibold', ACTION_COLORS[log.action] || 'text-slate-400')}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                  <span className="text-slate-500">{log.entityType}</span>
                  {log.entityId && <span className="ml-1 font-mono text-slate-600">#{log.entityId.slice(-6)}</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : 'â'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 shrink-0 bg-slate-900">
          <p className="text-xs text-slate-400">
            {pagination.total} total events Â· Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">â Prev</button>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next â</button>
          </div>
        </div>
      )}
    </div>
  );
}
