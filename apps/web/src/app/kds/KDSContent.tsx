'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { WSEventType } from '@pos/shared';

import { TicketCard } from '@/components/kds/TicketCard';
import { WSStatusBanner } from '@/components/ui/WSStatusBanner';
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

export default function KDSContent({ initialData }: KDSContentProps) {
  const queryClient = useQueryClient();
  const { user, locationId, setLocation } = useAuthStore();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(initialData.selectedStationId);

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
    [queryClient, refetch],
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

  function formatAvg(seconds?: number) {
    if (!seconds) return '--';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)] pb-6 text-white">
      <WSStatusBanner bar />

      <div className="border-b border-white/10 bg-slate-950/70 px-4 py-5 backdrop-blur-xl md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="section-kicker">Kitchen operations</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Kitchen Display System</h1>
            <p className="mt-2 text-sm text-slate-400">
              {user?.name || 'Kitchen Staff'} · {stations.length} station(s)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 xl:w-[420px]">
            <div className="ops-stat border-amber-300/20 bg-amber-400/8">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending</p>
              <p className="mt-2 text-3xl font-black text-amber-100 tabular-nums">{stats.pending ?? 0}</p>
            </div>
            <div className="ops-stat border-cyan-300/20 bg-cyan-400/8">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">In Progress</p>
              <p className="mt-2 text-3xl font-black text-cyan-100 tabular-nums">{stats.inProgress ?? 0}</p>
            </div>
            <div className="ops-stat border-emerald-300/20 bg-emerald-400/8">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Avg Time</p>
              <p className="mt-2 text-3xl font-black text-emerald-100 tabular-nums font-mono">
                {formatAvg(stats.averageTicketSeconds)}
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
              type="button"
              onClick={() => setSelectedStationId(station.id)}
              className={clsx(
                'touch-target rounded-2xl border px-4 text-sm font-bold transition-all',
                selectedStationId === station.id
                  ? 'border-transparent text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.18)]'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20',
              )}
              style={selectedStationId === station.id ? { backgroundColor: station.color || '#67e8f9' } : undefined}
            >
              {station.name}
            </button>
          ))}
          {stations.length === 0 && !stationsLoading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              No KDS stations configured. Add one in Admin &gt; KDS Stations.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-100">
              {stations.find((station: any) => station.id === selectedStationId)?.name || 'Tickets'}
            </h2>
            <p className="text-sm text-slate-500">{tickets.length} active ticket{tickets.length !== 1 ? 's' : ''}</p>
          </div>
          <button type="button" onClick={() => refetch()} className="btn-secondary touch-manipulation">
            Refresh
          </button>
        </div>

        {ticketsLoading ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
                <div className="h-6 w-2/3 animate-pulse rounded-xl bg-white/10" />
                <div className="space-y-2">
                  {[1, 2, 3].map((value) => <div key={value} className="h-14 animate-pulse rounded-2xl bg-white/8" />)}
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] py-20 text-slate-500">
            <div className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              All clear
            </div>
            <p className="text-base font-semibold text-slate-200">No active tickets for this station</p>
            <p className="mt-1 text-sm">Orders will appear here as soon as the POS fires them.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {tickets.map((ticket: any) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onBump={(id) => bumpMutation.mutate(id)}
                  onRush={(id) => rushMutation.mutate(id)}
                  onRecall={(id) => recallMutation.mutate(id)}
                  isBumping={bumpMutation.isPending && bumpMutation.variables === ticket.id}
                  isRushing={rushMutation.isPending && rushMutation.variables === ticket.id}
                  isRecalling={recallMutation.isPending && recallMutation.variables === ticket.id}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
