'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ReservationStatus, WSEventType } from '@pos/shared';

import api from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore, useUIStore } from '@/store';

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

type HostRailTab = 'book' | 'servers';
type HostReservation = {
  id: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationAt: string;
  status: ReservationStatus;
  quotedWaitMinutes?: number | null;
  confirmationCode: string;
  isVip?: boolean;
  table?: { id: string; name: string; status: string } | null;
};

function formatReservationTime(reservation: HostReservation) {
  if (reservation.status === ReservationStatus.WAITLIST && reservation.quotedWaitMinutes) {
    return `${reservation.quotedWaitMinutes} min`;
  }

  return new Date(reservation.reservationAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status: ReservationStatus) {
  switch (status) {
    case ReservationStatus.CONFIRMED:
      return 'Confirmed';
    case ReservationStatus.ARRIVED:
      return 'Arrived';
    case ReservationStatus.SEATED:
      return 'Seated';
    case ReservationStatus.WAITLIST:
      return 'Waitlist';
    case ReservationStatus.COMPLETED:
      return 'Completed';
    case ReservationStatus.NO_SHOW:
      return 'No-show';
    case ReservationStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}

function statusTone(status: ReservationStatus) {
  switch (status) {
    case ReservationStatus.CONFIRMED:
      return 'bg-blue-400/15 text-blue-200';
    case ReservationStatus.ARRIVED:
      return 'bg-amber-400/15 text-amber-200';
    case ReservationStatus.SEATED:
      return 'bg-emerald-400/15 text-emerald-200';
    case ReservationStatus.WAITLIST:
      return 'bg-violet-400/15 text-violet-200';
    case ReservationStatus.COMPLETED:
      return 'bg-slate-400/15 text-slate-200';
    default:
      return 'bg-rose-400/15 text-rose-200';
  }
}

export default function HostContent({ initialData }: HostContentProps) {
  const qc = useQueryClient();
  const { locationId, setLocation } = useAuthStore();
  const { hostPanelVisible, setHostPanelVisible } = useUIStore();
  const [hostRailTab, setHostRailTab] = useState<HostRailTab>('book');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(4);
  const [showSeatingModal, setShowSeatingModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<HostReservation | null>(null);
  const [reservationTableId, setReservationTableId] = useState('');
  const [reservationServerId, setReservationServerId] = useState('');

  const effectiveLocationId = locationId || initialData.locationId;
  const today = new Date().toISOString().slice(0, 10);

  const refreshHostData = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['tables', effectiveLocationId] });
    void qc.invalidateQueries({ queryKey: ['staff'] });
    void qc.invalidateQueries({ queryKey: ['reservations', 'host-book', today, effectiveLocationId] });
  }, [effectiveLocationId, qc, today]);

  useWebSocket(
    {
      [WSEventType.TABLE_UPDATED]: refreshHostData,
      [WSEventType.ORDER_CREATED]: refreshHostData,
      [WSEventType.ORDER_UPDATED]: refreshHostData,
      [WSEventType.RESERVATION_UPDATED]: refreshHostData,
    },
    [refreshHostData],
  );

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

  const { data: reservationBookData } = useQuery({
    queryKey: ['reservations', 'host-book', today, effectiveLocationId],
    queryFn: () =>
      api.getReservations({
        date: today,
        locationId: effectiveLocationId || undefined,
      }),
    enabled: !!effectiveLocationId,
    refetchInterval: 30000,
  });

  const { data: reservationSuggestionsData } = useQuery({
    queryKey: ['reservation-suggestions', selectedReservation?.id],
    queryFn: () => api.getReservationSuggestions(selectedReservation!.id),
    enabled: !!selectedReservation?.id,
  });

  const tables = tablesData?.data || [];
  const allStaff = staffData?.data || [];
  const reservations: HostReservation[] = reservationBookData?.data?.reservations || [];
  const activeServers = allStaff
    .filter(
      (member: any) =>
        member.isActive &&
        ['SERVER', 'BARTENDER'].includes(member.role?.toUpperCase()) &&
        member.locations.some((entry: any) => entry.location.id === effectiveLocationId),
    )
    .sort((left: any, right: any) => {
      const leftTime = left.lastSeatedAt ? new Date(left.lastSeatedAt).getTime() : 0;
      const rightTime = right.lastSeatedAt ? new Date(right.lastSeatedAt).getTime() : 0;
      return leftTime - rightTime;
    });

  const actionableReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        [ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED, ReservationStatus.WAITLIST].includes(
          reservation.status,
        ),
      ),
    [reservations],
  );

  const counts = useMemo(
    () => ({
      available: tables.filter((table: any) => table.status === 'AVAILABLE').length,
      occupied: tables.filter((table: any) => table.status === 'OCCUPIED').length,
      dirty: tables.filter((table: any) => table.status === 'DIRTY').length,
      waitlist: reservations.filter((reservation) => reservation.status === ReservationStatus.WAITLIST).length,
    }),
    [reservations, tables],
  );

  useEffect(() => {
    if (!selectedReservation) return;

    const suggestions = reservationSuggestionsData?.data;
    if (!suggestions) return;

    setReservationTableId(suggestions.suggestedTables?.[0]?.id || selectedReservation.table?.id || '');
    setReservationServerId(suggestions.suggestedServers?.[0]?.id || '');
  }, [reservationSuggestionsData?.data, selectedReservation]);

  const handleTableSelect = useCallback((table: any) => {
    setSelectedReservation(null);
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

  const updateReservationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      api.updateReservation(id, { status }),
    onSuccess: async () => {
      toast.success('Reservation updated');
      refreshHostData();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to update reservation'),
  });

  const seatReservationMutation = useMutation({
    mutationFn: ({ id, tableId, serverId }: { id: string; tableId: string; serverId: string }) =>
      api.seatReservation(id, { tableId, serverId }),
    onSuccess: async () => {
      toast.success('Reservation seated');
      setSelectedReservation(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['staff'] }),
        qc.invalidateQueries({ queryKey: ['tables', effectiveLocationId] }),
        qc.invalidateQueries({ queryKey: ['reservations', 'host-book', today, effectiveLocationId] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to seat reservation'),
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#08111f_0%,#0b1728_52%,#020617_100%)] px-2 py-2 md:px-3 md:py-3">
      <div
        className={clsx(
          'ops-shell flex min-h-0 flex-1 flex-col overflow-hidden xl:grid',
          hostPanelVisible
            ? 'xl:grid-cols-[minmax(0,1.18fr)_360px] 2xl:grid-cols-[minmax(0,1.24fr)_400px]'
            : 'xl:grid-cols-1',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ops-toolbar flex flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-4">
            <div>
              <p className="section-kicker">Host station</p>
              <h1 className="mt-1 text-xl font-black text-white md:text-2xl">Seat guests from one live floor</h1>
              <p className="mt-1 text-sm text-slate-400">
                Coordinate reservations, walk-ins, table status, and server balance without leaving the floor map.
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
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Waitlist</p>
                <p className="mt-1 text-2xl font-black text-violet-100">{counts.waitlist}</p>
              </div>
              <button
                type="button"
                onClick={() => setHostPanelVisible(!hostPanelVisible)}
                className={clsx(
                  'touch-target rounded-2xl border px-3 py-2 text-sm font-semibold transition',
                  hostPanelVisible
                    ? 'border-white/10 bg-white/5 text-slate-200'
                    : 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100',
                )}
              >
                {hostPanelVisible ? 'Hide host rail' : 'Show host rail'}
              </button>
            </div>
          </div>

          <div className="min-h-0 h-[calc(100%-93px)]">
            <TableMap
              initialTables={tables}
              locationId={effectiveLocationId || ''}
              onTableSelect={handleTableSelect}
              selectedTableId={selectedTable?.id || selectedReservation?.table?.id}
            />
          </div>
        </div>

        {hostPanelVisible && (
          <aside className="border-t border-white/10 bg-slate-950/35 p-3 xl:border-l xl:border-t-0">
            <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
                  {hostRailTab === 'book' ? <CalendarDaysIcon className="h-6 w-6" /> : <UserGroupIcon className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Host rail</p>
                  <h2 className="text-xl font-black text-white">
                    {hostRailTab === 'book' ? `${actionableReservations.length} active bookings` : `${activeServers.length} servers`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setHostPanelVisible(false)}
                  className="touch-target ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-200 transition hover:bg-white/10"
                  aria-label="Hide host rail"
                >
                  <ChevronDoubleRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                {([
                  ['book', 'Book'],
                  ['servers', 'Servers'],
                ] as [HostRailTab, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHostRailTab(value)}
                    className={clsx(
                      'touch-target flex-1 rounded-2xl px-3 py-2 text-sm font-bold transition',
                      hostRailTab === value
                        ? 'bg-cyan-300 text-slate-950'
                        : 'border border-white/10 bg-white/5 text-slate-200',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {hostRailTab === 'book' ? (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="soft-panel px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Upcoming</p>
                      <p className="mt-1 text-lg font-black text-white">
                        {reservations.filter((reservation) => reservation.status === ReservationStatus.CONFIRMED).length}
                      </p>
                    </div>
                    <div className="soft-panel px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Arrived</p>
                      <p className="mt-1 text-lg font-black text-amber-100">
                        {reservations.filter((reservation) => reservation.status === ReservationStatus.ARRIVED).length}
                      </p>
                    </div>
                    <div className="soft-panel px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Waitlist</p>
                      <p className="mt-1 text-lg font-black text-violet-100">{counts.waitlist}</p>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {actionableReservations.map((reservation) => (
                      <button
                        key={reservation.id}
                        type="button"
                        onClick={() => setSelectedReservation(reservation)}
                        className={clsx(
                          'touch-target w-full rounded-[24px] border p-4 text-left transition-all',
                          selectedReservation?.id === reservation.id
                            ? 'border-cyan-300/30 bg-cyan-300/10'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-base font-black text-white">{reservation.guestName}</p>
                              {reservation.isVip && (
                                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                              {formatReservationTime(reservation)} · {reservation.partySize} guests
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {reservation.table?.name || 'Unassigned'} · {reservation.confirmationCode}
                            </p>
                          </div>
                          <span className={clsx('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', statusTone(reservation.status))}>
                            {statusLabel(reservation.status)}
                          </span>
                        </div>
                      </button>
                    ))}

                    {actionableReservations.length === 0 && (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
                        No active reservations or waitlist entries right now.
                      </div>
                    )}
                  </div>

                  {selectedReservation && (
                    <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Selected booking
                          </p>
                          <p className="mt-1 text-base font-black text-white">{selectedReservation.guestName}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatReservationTime(selectedReservation)} · {selectedReservation.partySize} guests
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedReservation(null)}
                          className="touch-target rounded-2xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"
                        >
                          Clear
                        </button>
                      </div>

                      {selectedReservation.status === ReservationStatus.CONFIRMED && (
                        <button
                          type="button"
                          onClick={() =>
                            updateReservationMutation.mutate({
                              id: selectedReservation.id,
                              status: ReservationStatus.ARRIVED,
                            })
                          }
                          className="touch-target mt-4 w-full rounded-2xl border border-amber-300/20 bg-amber-400/10 py-3 text-sm font-bold text-amber-100"
                        >
                          Mark arrived
                        </button>
                      )}

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Suggested table</p>
                          <select
                            value={reservationTableId}
                            onChange={(event) => setReservationTableId(event.target.value)}
                            className="input mt-2 w-full rounded-2xl"
                          >
                            <option value="">Choose a table</option>
                            {(reservationSuggestionsData?.data?.suggestedTables || []).map((table: any) => (
                              <option key={table.id} value={table.id}>
                                {table.name} · {table.capacity} seats · {String(table.status).toLowerCase()}
                              </option>
                            ))}
                            {tables
                              .filter((table: any) => !reservationSuggestionsData?.data?.suggestedTables?.some((entry: any) => entry.id === table.id))
                              .map((table: any) => (
                                <option key={table.id} value={table.id}>
                                  {table.name} · {table.capacity} seats · {String(table.status).toLowerCase()}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Suggested server</p>
                          <select
                            value={reservationServerId}
                            onChange={(event) => setReservationServerId(event.target.value)}
                            className="input mt-2 w-full rounded-2xl"
                          >
                            <option value="">Choose a server</option>
                            {(reservationSuggestionsData?.data?.suggestedServers || activeServers).map((server: any) => (
                              <option key={server.id} value={server.id}>
                                {server.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            seatReservationMutation.mutate({
                              id: selectedReservation.id,
                              tableId: reservationTableId,
                              serverId: reservationServerId,
                            })
                          }
                          disabled={!reservationTableId || !reservationServerId || seatReservationMutation.isPending}
                          className="touch-target w-full rounded-2xl bg-emerald-400 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                        >
                          {seatReservationMutation.isPending ? 'Seating...' : 'Seat and open check'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                          <span
                            className={clsx(
                              'rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em]',
                              selectedServer?.id === server.id ? 'bg-slate-950/10' : 'bg-white/8 text-slate-400',
                            )}
                          >
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
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {!hostPanelVisible && (
        <button
          type="button"
          onClick={() => setHostPanelVisible(true)}
          className="absolute right-4 top-24 z-20 hidden items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/88 px-3 py-2 text-sm font-semibold text-slate-100 shadow-xl backdrop-blur xl:inline-flex"
        >
          <ChevronDoubleLeftIcon className="h-4 w-4" />
          Host rail
        </button>
      )}

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
