'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { WSEventType } from '@pos/shared';

import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { useAuthStore } from '@/store';

interface KDSContentProps {
  initialData: {
    stations: any[];
    tickets: any[];
    stats: any;
    selectedStationId: string | null;
    locationId: string | null;
  };
}

function formatElapsed(seconds?: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getTicketTone(ticket: any) {
  const elapsed = ticket.elapsedSeconds ?? 0;

  if (ticket.priority === 'rush') return 'kds-ticket-rush';
  if (elapsed >= 900) return 'kds-ticket-danger';
  if (elapsed >= 600) return 'kds-ticket-warning';

  return 'kds-ticket-normal';
}

function TicketSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 h-6 animate-pulse rounded-xl bg-white/10" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export default function KDSContent({ initialData }: KDSContentProps) {
  const queryClient = useQueryClient();
  const { user, locationId, setLocation } = useAuthStore();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    initialData.selectedStationId
  );

  const effectiveLocationId = locationId || initialData.locationId || null;

  useEffect(() => {
    if (!locationId && initialData.locationId) {
      setLocation(initialData.locationId);
    }
  }, [initialData.locationId, locationId, setLocation]);

  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['kds-stations', effectiveLocationId],
    queryFn: () => api.getStations(effectiveLocationId || undefined),
    enabled: !!effectiveLocationId,
    refetchInterval: 30000,
    initialData: { success: true, data: initialData.stations },
  });

  const stations: any[] = stationsData?.data || [];

  useEffect(() => {
    if (!selectedStationId && stations.length > 0) {
      setSelectedStationId(stations[0].id);
    }
  }, [selectedStationId, stations]);

  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: ['kds-tickets', selectedStationId, effectiveLocationId],
    queryFn: () =>
      api.getKDSTickets({
        stationId: selectedStationId || undefined,
        locationId: effectiveLocationId || undefined,
      }),
    enabled: !!selectedStationId,
    refetchInterval: 10000,
    initialData:
      selectedStationId === initialData.selectedStationId
        ? { success: true, data: initialData.tickets }
        : undefined,
  });

  const { data: statsData } = useQuery({
    queryKey: ['kds-stats', effectiveLocationId],
    queryFn: () => api.getKDSStats(effectiveLocationId || undefined),
    enabled: !!effectiveLocationId,
    refetchInterval: 15000,
    initialData: initialData.stats ? { success: true, data: initialData.stats } : undefined,
  });

  const bumpMutation = useMutation({
    mutationFn: (ticketId: string) => api.bumpTicket(ticketId),
    onSuccess: async () => {
      toast.success('Ticket bumped');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to bump ticket'),
  });

  const recallMutation = useMutation({
    mutationFn: (ticketId: string) => api.recallTicket(ticketId),
    onSuccess: async () => {
      toast.success('Ticket recalled');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to recall ticket'),
  });

  const rushMutation = useMutation({
    mutationFn: (ticketId: string) => api.setTicketPriority(ticketId, 'rush'),
    onSuccess: async () => {
      toast.success('Ticket marked rush');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Unable to mark rush'),
  });

  useWebSocket(
    {
      [WSEventType.ORDER_FIRED]: async () => {
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ['kds-stats'] });
      },
      [WSEventType.KDS_BUMP]: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
          queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
        ]);
      },
      [WSEventType.KDS_RECALL]: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
          queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
        ]);
      },
      [WSEventType.KDS_RUSH]: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['kds-tickets'] }),
          queryClient.invalidateQueries({ queryKey: ['kds-stats'] }),
        ]);
      },
    },
    [queryClient, refetch]
  );

  const tickets = useMemo(() => {
    const rawTickets = ticketsData?.data || [];

    return [...rawTickets].sort((left: any, right: any) => {
      const leftRush = left.priority === 'rush' ? 1 : 0;
      const rightRush = right.priority === 'rush' ? 1 : 0;

      if (leftRush !== rightRush) return rightRush - leftRush;

      return new Date(left.firedAt).getTime() - new Date(right.firedAt).getTime();
    });
  }, [ticketsData]);

  const stats = statsData?.data || {};

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)] pb-6 text-white">
      <div className="border-b border-white/10 bg-slate-950/70 px-4 py-5 backdrop-blur-xl md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-kicker">Kitchen operations</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Kitchen Display System</h1>
            <p className="mt-2 text-sm text-slate-400">
              {user?.name || 'Kitchen Staff'} / {stations.length} station(s) available
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-100">{stats.pending || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-cyan-100">{stats.inProgress || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Avg Time</p>
              <p className="mt-1 text-2xl font-bold text-emerald-100">
                {formatElapsed(stats.averageTicketSeconds)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 px-4 py-4 md:px-6">
        <div className="flex flex-wrap gap-2">
          {stations.map((station: any) => (
            <button
              key={station.id}
              onClick={() => setSelectedStationId(station.id)}
              className={clsx(
                'touch-target rounded-2xl border px-4 text-sm font-medium transition-all',
                selectedStationId === station.id
                  ? 'border-transparent text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.18)]'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              )}
              style={
                selectedStationId === station.id
                  ? { backgroundColor: station.color || '#67e8f9' }
                  : undefined
              }
            >
              {station.name}
            </button>
          ))}

          {stations.length === 0 && !stationsLoading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              No KDS stations are configured yet. Add one in Admin.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {stations.find((station: any) => station.id === selectedStationId)?.name || 'Tickets'}
            </h2>
            <p className="text-sm text-slate-500">{tickets.length} active ticket(s)</p>
          </div>

          <button onClick={() => refetch()} className="btn-secondary">
            Refresh
          </button>
        </div>

        {ticketsLoading ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <TicketSkeleton key={index} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-slate-500">
            No active tickets for this station.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className={clsx('kds-ticket p-5', getTicketTone(ticket))}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {ticket.station?.name || 'Station'}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {ticket.order?.tableName
                        ? `Table ${ticket.order.tableName}`
                        : ticket.order?.type || 'Order'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {ticket.order?.serverName || 'Unknown server'} / {ticket.order?.guestCount || 0} guests
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Elapsed</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-white">
                      {formatElapsed(ticket.elapsedSeconds)}
                    </p>
                    {ticket.priority === 'rush' && (
                      <span className="mt-2 inline-block rounded-full bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-100">
                        Rush
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {(ticket.items || []).map((item: any, index: number) => (
                    <div key={item.id || index} className="rounded-2xl bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-100">
                            {item.quantity || 1} x {item.menuItemName || item.name || 'Item'}
                          </p>
                          {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                            <p className="mt-1 text-sm text-slate-400">{item.modifiers.join(', ')}</p>
                          )}
                          {item.notes && <p className="mt-1 text-sm text-amber-200">Note: {item.notes}</p>}
                        </div>
                        <span className="rounded-full bg-slate-950/80 px-2 py-1 text-xs text-slate-300">
                          {item.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => rushMutation.mutate(ticket.id)}
                    disabled={rushMutation.isPending}
                    className="rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-3 text-sm font-semibold text-red-100 transition-colors hover:bg-red-400/15"
                  >
                    Rush
                  </button>
                  <button
                    onClick={() => recallMutation.mutate(ticket.id)}
                    disabled={recallMutation.isPending}
                    className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
                  >
                    Recall
                  </button>
                  <button
                    onClick={() => bumpMutation.mutate(ticket.id)}
                    disabled={bumpMutation.isPending}
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/15"
                  >
                    Bump
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
