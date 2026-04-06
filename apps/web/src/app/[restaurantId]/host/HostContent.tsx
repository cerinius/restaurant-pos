'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserGroupIcon } from '@heroicons/react/24/outline';

import api from '@/lib/api';
import { useAuthStore } from '@/store';

const TableMap = dynamic(
  () => import('@/components/pos/TableMap').then((module) => module.TableMap),
  {
    loading: () => <div className="h-full animate-pulse rounded-[30px] bg-slate-800" />,
  },
);

interface HostContentProps {
  initialData: {
    tables: any[];
    locationId: string | null;
  };
}

export default function HostContent({ initialData }: HostContentProps) {
  const qc = useQueryClient();
  const { locationId, setLocation } = useAuthStore();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(4);
  const [showSeatingModal, setShowSeatingModal] = useState(false);

  const effectiveLocationId = locationId || initialData.locationId;

  useEffect(() => {
    if (!locationId && initialData.locationId) {
      setLocation(initialData.locationId);
    }
  }, [initialData.locationId, locationId, setLocation]);

  const { data: tablesData } = useQuery({
    queryKey: ['tables', effectiveLocationId],
    queryFn: () => api.getTables({ locationId: effectiveLocationId }),
    refetchInterval: 30000,
    enabled: !!effectiveLocationId,
    initialData: { success: true, data: initialData.tables },
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.getStaff(),
    enabled: !!effectiveLocationId,
  });

  const tables = tablesData?.data || [];
  const allStaff = staffData?.data || [];
  const activeServers = allStaff
    .filter(
      (member: any) =>
        member.isActive &&
        ['SERVER', 'BARTENDER'].includes(member.role?.toUpperCase()) &&
        member.locations.some((location: any) => location.location.id === effectiveLocationId),
    )
    .sort((left: any, right: any) => {
      const leftTime = left.lastSeatedAt ? new Date(left.lastSeatedAt).getTime() : 0;
      const rightTime = right.lastSeatedAt ? new Date(right.lastSeatedAt).getTime() : 0;
      return leftTime - rightTime;
    });

  const counts = useMemo(
    () => ({
      available: tables.filter((table: any) => table.status === 'AVAILABLE').length,
      occupied: tables.filter((table: any) => table.status === 'OCCUPIED').length,
      dirty: tables.filter((table: any) => table.status === 'DIRTY').length,
    }),
    [tables],
  );

  const handleTableSelect = useCallback((table: any) => {
    setSelectedTable(table);
    setGuestCount(table.capacity || 4);
    setShowSeatingModal(true);
  }, []);

  const seatingMutation = useMutation({
    mutationFn: async ({ tableId, serverId, guests }: { tableId: string; serverId: string; guests: number }) => {
      await api.updateStaff(serverId, { lastSeatedAt: new Date().toISOString() });
      return api.createOrder({
        tableId,
        serverId,
        guestCount: guests,
        type: 'DINE_IN',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['staff'] }),
        qc.invalidateQueries({ queryKey: ['tables', effectiveLocationId] }),
      ]);
      toast.success('Table seated');
      setShowSeatingModal(false);
      setSelectedTable(null);
      setSelectedServer(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to seat table'),
  });

  const handleSeatTable = () => {
    if (!selectedTable || !selectedServer) return;

    seatingMutation.mutate({
      tableId: selectedTable.id,
      serverId: selectedServer.id,
      guests: Math.max(1, guestCount),
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#0b1728_52%,#020617_100%)] px-3 py-3 md:px-4 md:py-4">
      <div className="ops-shell flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 overflow-hidden">
          <div className="ops-toolbar flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="section-kicker">Host station</p>
              <h1 className="mt-1 text-2xl font-black text-white">Seat guests quickly and confidently</h1>
              <p className="mt-1 text-sm text-slate-400">
                Choose a table, assign the best next server, and keep the floor moving.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="ops-stat min-w-[110px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Available</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">{counts.available}</p>
              </div>
              <div className="ops-stat min-w-[110px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Occupied</p>
                <p className="mt-1 text-2xl font-black text-sky-100">{counts.occupied}</p>
              </div>
              <div className="ops-stat min-w-[110px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Dirty</p>
                <p className="mt-1 text-2xl font-black text-amber-100">{counts.dirty}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 h-[calc(100%-101px)]">
            <TableMap
              initialTables={tables}
              locationId={effectiveLocationId || ''}
              onTableSelect={handleTableSelect}
              selectedTableId={selectedTable?.id}
            />
          </div>
        </div>

        <aside className="border-t border-white/10 bg-slate-950/35 p-4 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Servers</p>
                <h2 className="text-xl font-black text-white">{activeServers.length} available</h2>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Ordered by who has gone longest since their last seating to help balance the floor.
            </p>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
              {activeServers.map((server: any, index: number) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => setSelectedServer(server)}
                  className={clsx(
                    'touch-target w-full rounded-[24px] border p-4 text-left transition-all',
                    selectedServer?.id === server.id
                      ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.06]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black">{server.name}</p>
                      <p className={clsx('mt-1 text-sm', selectedServer?.id === server.id ? 'text-slate-950/70' : 'text-slate-400')}>
                        {server.role}
                      </p>
                    </div>
                    <span className={clsx('rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]', selectedServer?.id === server.id ? 'bg-slate-950/10' : 'bg-white/8 text-slate-400')}>
                      #{index + 1}
                    </span>
                  </div>
                </button>
              ))}

              {activeServers.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
                  No active servers found for this location.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showSeatingModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center">
          <div className="card w-full max-w-2xl overflow-hidden">
            <div className="ops-toolbar px-5 py-5">
              <p className="section-kicker">Seat table</p>
              <h3 className="mt-1 text-2xl font-black text-white">{selectedTable.name}</h3>
              <p className="mt-1 text-sm text-slate-400">
                Assign a server and confirm the guest count before opening service.
              </p>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label className="label">Server</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeServers.map((server: any) => (
                    <button
                      key={server.id}
                      type="button"
                      onClick={() => setSelectedServer(server)}
                      className={clsx(
                        'touch-target rounded-[22px] border p-4 text-left transition-all',
                        selectedServer?.id === server.id
                          ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-white/[0.04] text-slate-100',
                      )}
                    >
                      <p className="text-sm font-black">{server.name}</p>
                      <p className={clsx('mt-1 text-sm', selectedServer?.id === server.id ? 'text-slate-950/70' : 'text-slate-400')}>
                        {server.role}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Guest Count</label>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(event) => setGuestCount(Number(event.target.value))}
                    min={1}
                    className="input w-full rounded-2xl text-center text-2xl font-black"
                  />
                  <p className="mt-3 text-sm text-slate-500">
                    Capacity: {selectedTable.capacity || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-950/45 p-5">
              <button
                type="button"
                onClick={() => {
                  setShowSeatingModal(false);
                  setSelectedTable(null);
                }}
                className="touch-target rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeatTable}
                disabled={!selectedServer || seatingMutation.isPending}
                className="touch-target rounded-2xl bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {seatingMutation.isPending ? 'Seating...' : 'Seat Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
