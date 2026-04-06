'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { ReservationSource, ReservationStatus, WSEventType } from '@pos/shared';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store';

type ReservationRecord = {
  id: string;
  locationId: string;
  tableId?: string | null;
  orderId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  partySize: number;
  reservationAt: string;
  status: ReservationStatus;
  source: ReservationSource;
  confirmationCode: string;
  notes?: string | null;
  specialRequests?: string | null;
  tags: string[];
  isVip: boolean;
  visitCount: number;
  quotedWaitMinutes?: number | null;
  table?: {
    id: string;
    name: string;
    capacity: number;
    status: string;
  } | null;
  order?: {
    id: string;
    status: string;
    tableName?: string | null;
    serverName?: string | null;
  } | null;
};

type ReservationStats = {
  total: number;
  confirmed: number;
  seated: number;
  arrived: number;
  waitlist: number;
  covers: number;
};

type TabFilter = 'all' | 'upcoming' | 'waitlist' | 'completed';

const TODAY = format(new Date(), 'yyyy-MM-dd');
const STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.CONFIRMED]: 'Confirmed',
  [ReservationStatus.ARRIVED]: 'Arrived',
  [ReservationStatus.SEATED]: 'Seated',
  [ReservationStatus.COMPLETED]: 'Completed',
  [ReservationStatus.NO_SHOW]: 'No Show',
  [ReservationStatus.CANCELLED]: 'Cancelled',
  [ReservationStatus.WAITLIST]: 'Waitlist',
};
const STATUS_STYLES: Record<ReservationStatus, string> = {
  [ReservationStatus.CONFIRMED]: 'bg-blue-400/15 text-blue-200',
  [ReservationStatus.ARRIVED]: 'bg-amber-400/15 text-amber-200',
  [ReservationStatus.SEATED]: 'bg-emerald-400/15 text-emerald-200',
  [ReservationStatus.COMPLETED]: 'bg-slate-400/15 text-slate-200',
  [ReservationStatus.NO_SHOW]: 'bg-rose-400/15 text-rose-200',
  [ReservationStatus.CANCELLED]: 'bg-rose-400/15 text-rose-200',
  [ReservationStatus.WAITLIST]: 'bg-violet-400/15 text-violet-200',
};
const SOURCE_LABELS: Record<ReservationSource, string> = {
  [ReservationSource.PHONE]: 'Phone',
  [ReservationSource.ONLINE]: 'Online',
  [ReservationSource.WALK_IN]: 'Walk-in',
  [ReservationSource.APP]: 'App',
};

function reservationTimeLabel(reservation: ReservationRecord) {
  if (reservation.status === ReservationStatus.WAITLIST && reservation.quotedWaitMinutes) {
    return `${reservation.quotedWaitMinutes} min`;
  }

  return format(new Date(reservation.reservationAt), 'h:mm a');
}

function ReservationFormModal({
  locationId,
  tables,
  onClose,
  onSave,
}: {
  locationId: string;
  tables: any[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: 2,
    date: TODAY,
    time: '19:00',
    status: ReservationStatus.CONFIRMED,
    source: ReservationSource.ONLINE,
    tableId: '',
    quotedWaitMinutes: 20,
    specialRequests: '',
    isVip: false,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">New reservation</h2>
            <p className="mt-1 text-sm text-slate-400">Capture bookings, waitlist entries, and guest notes.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Guest name</span>
            <input
              value={form.guestName}
              onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))}
              className="input w-full rounded-2xl"
              placeholder="Full name"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Phone</span>
            <input
              value={form.guestPhone}
              onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))}
              className="input w-full rounded-2xl"
              placeholder="(555) 555-5555"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</span>
            <input
              value={form.guestEmail}
              onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))}
              className="input w-full rounded-2xl"
              placeholder="guest@example.com"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Party size</span>
            <input
              type="number"
              min={1}
              value={form.partySize}
              onChange={(event) => setForm((current) => ({ ...current, partySize: Number(event.target.value) || 1 }))}
              className="input w-full rounded-2xl"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as ReservationStatus }))
              }
              className="input w-full rounded-2xl"
            >
              <option value={ReservationStatus.CONFIRMED}>Confirmed</option>
              <option value={ReservationStatus.WAITLIST}>Waitlist</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="input w-full rounded-2xl"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {form.status === ReservationStatus.WAITLIST ? 'Check-in time' : 'Reservation time'}
            </span>
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              className="input w-full rounded-2xl"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Source</span>
            <select
              value={form.source}
              onChange={(event) =>
                setForm((current) => ({ ...current, source: event.target.value as ReservationSource }))
              }
              className="input w-full rounded-2xl"
            >
              {Object.values(ReservationSource).map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Preferred table</span>
            <select
              value={form.tableId}
              onChange={(event) => setForm((current) => ({ ...current, tableId: event.target.value }))}
              className="input w-full rounded-2xl"
            >
              <option value="">Unassigned</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} · {table.capacity} seats
                </option>
              ))}
            </select>
          </label>

          {form.status === ReservationStatus.WAITLIST && (
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Quoted wait</span>
              <input
                type="number"
                min={0}
                value={form.quotedWaitMinutes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, quotedWaitMinutes: Number(event.target.value) || 0 }))
                }
                className="input w-full rounded-2xl"
              />
            </label>
          )}

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Special requests</span>
            <textarea
              value={form.specialRequests}
              onChange={(event) =>
                setForm((current) => ({ ...current, specialRequests: event.target.value }))
              }
              className="input min-h-[110px] w-full rounded-2xl"
              placeholder="Allergies, celebration notes, VIP details, seating preferences..."
            />
          </label>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isVip}
              onChange={(event) => setForm((current) => ({ ...current, isVip: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-300">Mark as VIP guest</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-4 py-2.5">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...form,
                locationId,
                tableId: form.tableId || undefined,
                quotedWaitMinutes:
                  form.status === ReservationStatus.WAITLIST ? form.quotedWaitMinutes : undefined,
              })
            }
            className="btn-primary px-4 py-2.5"
          >
            Save reservation
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationDrawer({
  reservation,
  tables,
  staff,
  onClose,
  onQuickStatus,
  onSeat,
}: {
  reservation: ReservationRecord;
  tables: any[];
  staff: any[];
  onClose: () => void;
  onQuickStatus: (status: ReservationStatus) => void;
  onSeat: (payload: { tableId: string; serverId: string }) => void;
}) {
  const [tableId, setTableId] = useState(reservation.tableId || '');
  const [serverId, setServerId] = useState(staff[0]?.id || '');
  const canSeat = [ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED, ReservationStatus.WAITLIST].includes(
    reservation.status,
  );

  useEffect(() => {
    setTableId(reservation.tableId || '');
  }, [reservation.id, reservation.tableId]);

  useEffect(() => {
    if (!serverId && staff[0]?.id) {
      setServerId(staff[0].id);
    }
  }, [serverId, staff]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{reservation.confirmationCode}</p>
            <h2 className="mt-1 text-2xl font-black text-white">{reservation.guestName}</h2>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {[
            ['Time', format(new Date(reservation.reservationAt), 'EEEE, MMM d · h:mm a')],
            ['Party', `${reservation.partySize} guests`],
            ['Status', STATUS_LABELS[reservation.status]],
            ['Source', SOURCE_LABELS[reservation.source]],
            ['Phone', reservation.guestPhone],
            ['Email', reservation.guestEmail || 'Not provided'],
            ['Table', reservation.table?.name || 'Unassigned'],
            ['Visit count', String(reservation.visitCount)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
              <span className="text-right text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>

        {(reservation.specialRequests || reservation.notes) && (
          <div className="mt-5 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Guest notes</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-100">
              {reservation.specialRequests || reservation.notes}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {reservation.status === ReservationStatus.CONFIRMED && (
            <button onClick={() => onQuickStatus(ReservationStatus.ARRIVED)} className="btn-primary w-full">
              Mark arrived
            </button>
          )}
          {canSeat && (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black text-white">Seat this guest</p>
              <div className="mt-4 space-y-3">
                <select value={tableId} onChange={(event) => setTableId(event.target.value)} className="input w-full rounded-2xl">
                  <option value="">Choose a table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} · {table.capacity} seats · {String(table.status).toLowerCase()}
                    </option>
                  ))}
                </select>
                <select value={serverId} onChange={(event) => setServerId(event.target.value)} className="input w-full rounded-2xl">
                  <option value="">Choose a server</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onSeat({ tableId, serverId })}
                  disabled={!tableId || !serverId}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  Seat and open order
                </button>
              </div>
            </div>
          )}
          {!reservation.orderId && reservation.status !== ReservationStatus.NO_SHOW && (
            <button onClick={() => onQuickStatus(ReservationStatus.NO_SHOW)} className="btn-danger w-full">
              Mark no-show
            </button>
          )}
          {reservation.status !== ReservationStatus.CANCELLED && !reservation.orderId && (
            <button onClick={() => onQuickStatus(ReservationStatus.CANCELLED)} className="btn-secondary w-full">
              Cancel reservation
            </button>
          )}
          {reservation.status === ReservationStatus.SEATED && (
            <button onClick={() => onQuickStatus(ReservationStatus.COMPLETED)} className="btn-secondary w-full">
              Mark completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const { locationId: authLocationId } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationRecord | null>(null);

  const invalidateReservationData = () => {
    void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['tables'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['staff'] });
  };

  useWebSocket(
    {
      [WSEventType.RESERVATION_UPDATED]: invalidateReservationData,
      [WSEventType.TABLE_UPDATED]: invalidateReservationData,
    },
    [queryClient],
  );

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.getLocations(),
  });

  const locations = locationsQuery.data?.data || [];

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(authLocationId || locations[0].id);
    }
  }, [authLocationId, locations, selectedLocationId]);

  const reservationsQuery = useQuery({
    queryKey: ['reservations', selectedDate, selectedLocationId, search],
    queryFn: () =>
      api.getReservations({
        date: selectedDate,
        locationId: selectedLocationId || undefined,
        search: search || undefined,
      }),
    enabled: !!selectedLocationId,
  });

  const tablesQuery = useQuery({
    queryKey: ['tables', selectedLocationId],
    queryFn: () => api.getTables({ locationId: selectedLocationId }),
    enabled: !!selectedLocationId,
  });

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.getStaff(),
    enabled: !!selectedLocationId,
  });

  const reservations: ReservationRecord[] = reservationsQuery.data?.data?.reservations || [];
  const stats: ReservationStats =
    reservationsQuery.data?.data?.stats || { total: 0, confirmed: 0, seated: 0, arrived: 0, waitlist: 0, covers: 0 };
  const tables = tablesQuery.data?.data || [];
  const staff = (staffQuery.data?.data || []).filter((member: any) =>
    member.isActive && ['SERVER', 'BARTENDER'].includes(member.role),
  );

  const createReservationMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createReservation(payload),
    onSuccess: () => {
      toast.success('Reservation saved');
      setShowNewModal(false);
      invalidateReservationData();
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to save reservation'),
  });

  const updateReservationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.updateReservation(id, payload),
    onSuccess: (_, variables) => {
      toast.success(`Reservation updated to ${STATUS_LABELS[variables.payload.status as ReservationStatus] || 'saved'}`);
      invalidateReservationData();
      setSelectedReservation((current) =>
        current && current.id === variables.id ? { ...current, ...(variables.payload as any) } : current,
      );
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to update reservation'),
  });

  const seatReservationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.seatReservation(id, payload),
    onSuccess: () => {
      toast.success('Guest seated and order opened');
      invalidateReservationData();
      setSelectedReservation(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Failed to seat reservation'),
  });

  const filteredReservations = useMemo(() => {
    if (tab === 'upcoming') {
      return reservations.filter((reservation) =>
        [ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED].includes(reservation.status),
      );
    }

    if (tab === 'waitlist') {
      return reservations.filter((reservation) => reservation.status === ReservationStatus.WAITLIST);
    }

    if (tab === 'completed') {
      return reservations.filter((reservation) =>
        [ReservationStatus.SEATED, ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW, ReservationStatus.CANCELLED].includes(
          reservation.status,
        ),
      );
    }

    return reservations;
  }, [reservations, tab]);

  const tabCounts = {
    all: reservations.length,
    upcoming: reservations.filter((reservation) =>
      [ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED].includes(reservation.status),
    ).length,
    waitlist: reservations.filter((reservation) => reservation.status === ReservationStatus.WAITLIST).length,
    completed: reservations.filter((reservation) =>
      [ReservationStatus.SEATED, ReservationStatus.COMPLETED, ReservationStatus.NO_SHOW, ReservationStatus.CANCELLED].includes(
        reservation.status,
      ),
    ).length,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {showNewModal && selectedLocationId && (
        <ReservationFormModal
          locationId={selectedLocationId}
          tables={tables}
          onClose={() => setShowNewModal(false)}
          onSave={(payload) => createReservationMutation.mutate(payload)}
        />
      )}

      {selectedReservation && (
        <ReservationDrawer
          reservation={selectedReservation}
          tables={tables}
          staff={staff}
          onClose={() => setSelectedReservation(null)}
          onQuickStatus={(status) =>
            updateReservationMutation.mutate({
              id: selectedReservation.id,
              payload: { status },
            })
          }
          onSeat={({ tableId, serverId }) =>
            seatReservationMutation.mutate({
              id: selectedReservation.id,
              payload: { tableId, serverId },
            })
          }
        />
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Reservations</h1>
            <p className="mt-1 text-sm text-slate-400">
              Live reservation book, waitlist management, and host-ready seating actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              className="input rounded-2xl"
            >
              {locations.map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="input rounded-2xl"
            />
            <button onClick={() => setShowNewModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5">
              <PlusIcon className="h-4 w-4" />
              New reservation
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Bookings', value: stats.total, icon: CalendarDaysIcon, color: 'text-white' },
            { label: 'Covers', value: stats.covers, icon: UserGroupIcon, color: 'text-cyan-300' },
            { label: 'Confirmed', value: stats.confirmed, icon: ClockIcon, color: 'text-blue-300' },
            { label: 'Arrived', value: stats.arrived, icon: StarIcon, color: 'text-amber-300' },
            { label: 'Waitlist', value: stats.waitlist, icon: UserGroupIcon, color: 'text-violet-300' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <stat.icon className={clsx('h-5 w-5', stat.color)} />
              <p className={clsx('mt-3 text-3xl font-black', stat.color)}>{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, phone, or confirmation code..."
              className="input w-full rounded-2xl py-3 pl-10"
            />
          </div>
          {([
            ['all', 'All'],
            ['upcoming', 'Upcoming'],
            ['waitlist', 'Waitlist'],
            ['completed', 'Done'],
          ] as [TabFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'rounded-2xl px-4 py-2 text-sm font-bold',
                tab === key ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 text-slate-300',
              )}
            >
              {label} ({tabCounts[key]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredReservations.map((reservation) => (
            <button
              key={reservation.id}
              onClick={() => setSelectedReservation(reservation)}
              className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.06]"
            >
              <div>
                <p className="text-sm font-black text-white">{reservationTimeLabel(reservation)}</p>
                <p className="text-xs text-slate-500">{reservation.partySize} guests</p>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-white">{reservation.guestName}</p>
                  {reservation.isVip && <StarSolid className="h-4 w-4 text-amber-400" />}
                  {reservation.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-200">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{reservation.guestPhone}</span>
                  <span>{reservation.table?.name || 'Unassigned table'}</span>
                  <span>{SOURCE_LABELS[reservation.source]}</span>
                  {reservation.order?.serverName && <span>Server: {reservation.order.serverName}</span>}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={clsx('rounded-full px-3 py-1 text-xs font-bold', STATUS_STYLES[reservation.status])}>
                  {STATUS_LABELS[reservation.status]}
                </span>
                <span className="text-xs text-slate-500">{reservation.confirmationCode}</span>
              </div>
            </button>
          ))}

          {!reservationsQuery.isLoading && filteredReservations.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-white/10 px-6 py-16 text-center">
              <p className="text-lg font-black text-slate-300">No reservations for this view</p>
              <p className="mt-2 text-sm text-slate-500">Change the date, location, or filters to explore the book.</p>
            </div>
          )}
        </div>

        {reservationsQuery.isLoading && (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] px-6 py-8 text-sm text-slate-400">
            Loading reservation book...
          </div>
        )}

        {selectedReservation && (
          <div className="sr-only">
            <PhoneIcon />
            <EnvelopeIcon />
          </div>
        )}
      </div>
    </div>
  );
}
