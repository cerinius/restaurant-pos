'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { WSEventType } from '@pos/shared';

import api from '@/lib/api';
import { useAuthStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';

// ... (Keep all your existing Type definitions: Station, TicketItem, KDSTicket, KDSStats)

function ElapsedTimer({
  firedAt,
  warningAt = 600,
  dangerAt = 900,
}: {
  firedAt: string;
  warningAt?: number;
  dangerAt?: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const fired = new Date(firedAt).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - fired) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [firedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <span className={clsx(
      'font-mono text-lg font-bold',
      elapsed >= dangerAt ? 'text-red-400' : elapsed >= warningAt ? 'text-yellow-400' : 'text-emerald-400',
    )}>
      {display}
    </span>
  );
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function KDSContent() {
  const { user, locationId } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['stations', locationId],
    queryFn: () => api.getStations(locationId || undefined),
    enabled: !!user,
  });

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    refetch,
  } = useQuery({
    queryKey: ['kds-tickets', selectedStationId, locationId],
    queryFn: () => api.getKDSTickets({
      stationId: selectedStationId || undefined,
      locationId: locationId || undefined,
    }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['kds-stats', locationId],
    queryFn: () => api.getKDSStats(locationId || undefined),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const bumpMutation = useMutation({
    mutationFn: (ticketId: string) => api.bumpTicket(ticketId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['kds-stats'] });
      toast.success('Ticket bumped');
    },
  });

  const recallMutation = useMutation({
    mutationFn: (ticketId: string) => api.recallTicket(ticketId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
      toast.success('Ticket recalled');
    },
  });

  const rushMutation = useMutation({
    mutationFn: (ticketId: string) => api.setTicketPriority(ticketId, 'rush'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
      toast.success('Ticket marked as rush');
    },
  });

  useWebSocket({
    [WSEventType.ORDER_FIRED]: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['kds-stats'] });
    },
    [WSEventType.KDS_BUMP]: () => refetch(),
    [WSEventType.KDS_RECALL]: () => refetch(),
  }, [selectedStationId, locationId]);

  const stations = stationsData?.data || [];
  const tickets = ticketsData?.data || [];
  const stats = statsData?.data || {};

  useEffect(() => {
    if (!selectedStationId && stations.length > 0) {
      setSelectedStationId(stations[0].id);
    }
  }, [selectedStationId, stations]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const aRush = a.priority === 'rush' ? 1 : 0;
      const bRush = b.priority === 'rush' ? 1 : 0;
      if (aRush !== bRush) return bRush - aRush;
      return new Date(a.firedAt).getTime() - new Date(b.firedAt).getTime();
    });
  }, [tickets]);

  const getTicketCardClasses = (ticket: any) => {
    const elapsed = ticket.elapsedSeconds ?? Math.floor((Date.now() - new Date(ticket.firedAt).getTime()) / 1000);
    if (ticket.priority === 'rush') return 'border-red-500 bg-red-950/30';
    if (elapsed >= 900) return 'border-red-400 bg-red-950/20';
    if (elapsed >= 600) return 'border-yellow-400 bg-yellow-950/20';
    return 'border-zinc-700 bg-zinc-900';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
       {/* ... Paste the rest of your JSX from your original file here ... */}
       <div className="mx-auto max-w-7xl">
         {/* Headers, stats grid, and ticket map go here exactly as in your prompt */}
       </div>
    </div>
  );
}