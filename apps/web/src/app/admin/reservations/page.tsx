'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  UserGroupIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReservationStatus = 'confirmed' | 'arrived' | 'seated' | 'completed' | 'no_show' | 'cancelled' | 'waitlist';

interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  status: ReservationStatus;
  table?: string;
  notes?: string;
  source: 'phone' | 'online' | 'walk_in' | 'app';
  isVIP: boolean;
  visitCount: number;
  tags: string[];
  confirmationCode: string;
  specialRequests?: string;
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

const SAMPLE_RESERVATIONS: Reservation[] = [
  {
    id: '1', guestName: 'Sarah Mitchell', guestPhone: '(647) 555-0142', guestEmail: 'sarah.m@email.com',
    partySize: 4, date: TODAY, time: '6:00 PM', status: 'confirmed', table: 'T12',
    source: 'online', isVIP: true, visitCount: 12, tags: ['birthday', 'vip'],
    confirmationCode: 'RES-4821', specialRequests: 'Birthday cake — chocolate. Nut allergy (guest 2).',
  },
  {
    id: '2', guestName: 'James Kauffman', guestPhone: '(416) 555-0234',
    partySize: 2, date: TODAY, time: '6:30 PM', status: 'arrived', table: 'T7',
    source: 'phone', isVIP: false, visitCount: 3, tags: ['anniversary'],
    confirmationCode: 'RES-4822', specialRequests: 'Anniversary dinner — please set table.',
  },
  {
    id: '3', guestName: 'Priya Nair', guestPhone: '(905) 555-0381', guestEmail: 'priya@corp.com',
    partySize: 6, date: TODAY, time: '7:00 PM', status: 'confirmed', table: 'T18',
    source: 'online', isVIP: true, visitCount: 8, tags: ['corporate', 'vip'],
    confirmationCode: 'RES-4823', specialRequests: 'Corporate dinner. 2 vegetarian, 1 vegan.',
  },
  {
    id: '4', guestName: 'Marcus Thompson', guestPhone: '(437) 555-0512',
    partySize: 3, date: TODAY, time: '7:00 PM', status: 'seated', table: 'T9',
    source: 'app', isVIP: false, visitCount: 1, tags: [],
    confirmationCode: 'RES-4824',
  },
  {
    id: '5', guestName: 'Lisa Chen', guestPhone: '(647) 555-0621',
    partySize: 2, date: TODAY, time: '7:30 PM', status: 'confirmed', table: 'T4',
    source: 'online', isVIP: false, visitCount: 5, tags: [],
    confirmationCode: 'RES-4825',
  },
  {
    id: '6', guestName: 'David Park', guestPhone: '(416) 555-0734',
    partySize: 5, date: TODAY, time: '7:30 PM', status: 'confirmed',
    source: 'phone', isVIP: false, visitCount: 2, tags: [],
    confirmationCode: 'RES-4826',
  },
  {
    id: '7', guestName: 'Emily Ross', guestPhone: '(905) 555-0845',
    partySize: 2, date: TODAY, time: '8:00 PM', status: 'confirmed', table: 'T6',
    source: 'online', isVIP: false, visitCount: 7, tags: ['regular'],
    confirmationCode: 'RES-4827',
  },
  {
    id: '8', guestName: 'Carlos Rivera', guestPhone: '(437) 555-0956',
    partySize: 4, date: TODAY, time: '8:30 PM', status: 'confirmed',
    source: 'online', isVIP: false, visitCount: 1, tags: [],
    confirmationCode: 'RES-4828',
  },
  // Waitlist
  {
    id: 'w1', guestName: 'Tom Bradley', guestPhone: '(416) 555-1001',
    partySize: 2, date: TODAY, time: 'ASAP', status: 'waitlist',
    source: 'walk_in', isVIP: false, visitCount: 0, tags: [],
    confirmationCode: 'WAIT-01', notes: 'Waiting ~20 min',
  },
  {
    id: 'w2', guestName: 'Nina Patel', guestPhone: '(647) 555-1102',
    partySize: 3, date: TODAY, time: 'ASAP', status: 'waitlist',
    source: 'walk_in', isVIP: false, visitCount: 2, tags: [],
    confirmationCode: 'WAIT-02', notes: 'Waiting ~35 min',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReservationStatus, { label: string; bg: string; text: string; dot: string }> = {
  confirmed:  { label: 'Confirmed',  bg: 'bg-blue-400/15',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  arrived:    { label: 'Arrived',    bg: 'bg-amber-400/15',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  seated:     { label: 'Seated',     bg: 'bg-emerald-400/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  completed:  { label: 'Completed',  bg: 'bg-slate-400/15',   text: 'text-slate-400',   dot: 'bg-slate-400' },
  no_show:    { label: 'No Show',    bg: 'bg-red-400/15',     text: 'text-red-400',     dot: 'bg-red-400' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-400/10',     text: 'text-red-400',     dot: 'bg-red-400' },
  waitlist:   { label: 'Waitlist',   bg: 'bg-violet-400/15',  text: 'text-violet-300',  dot: 'bg-violet-400' },
};

const SOURCE_ICONS: Record<Reservation['source'], string> = {
  phone: '📞', online: '🌐', walk_in: '🚶', app: '📱',
};

// ─── New Reservation Modal ────────────────────────────────────────────────────

function NewReservationModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Partial<Reservation>) => void }) {
  const [form, setForm] = useState({
    guestName: '', guestPhone: '', guestEmail: '',
    partySize: 2, date: TODAY, time: '7:00 PM',
    source: 'online' as Reservation['source'],
    specialRequests: '', isVIP: false,
  });

  const TIMES = ['5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName || !form.guestPhone) {
      toast.error('Guest name and phone are required');
      return;
    }
    onSave({
      ...form,
      status: 'confirmed',
      visitCount: 0,
      tags: [],
      confirmationCode: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New Reservation</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/8 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Guest Name *</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                placeholder="Full name"
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Phone *</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                placeholder="(000) 000-0000"
                value={form.guestPhone}
                onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Email</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                placeholder="optional"
                value={form.guestEmail}
                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Party Size</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.partySize}
                onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
              >
                {[1,2,3,4,5,6,7,8,10,12,15,20].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Date</label>
              <input
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Time</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              >
                {TIMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Source</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as Reservation['source'] })}
              >
                <option value="phone">Phone</option>
                <option value="online">Online</option>
                <option value="walk_in">Walk-in</option>
                <option value="app">App</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Special Requests / Notes</label>
              <textarea
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                rows={2}
                placeholder="Allergies, dietary restrictions, occasion..."
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="vip"
                checked={form.isVIP}
                onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
                className="rounded border-white/20"
              />
              <label htmlFor="vip" className="text-sm font-semibold text-slate-300">Mark as VIP guest</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Book Reservation</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reservation Row ─────────────────────────────────────────────────────────

function ReservationRow({
  reservation,
  onStatusChange,
  onSelect,
}: {
  reservation: Reservation;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onSelect: (r: Reservation) => void;
}) {
  const sc = STATUS_CONFIG[reservation.status];
  const NEXT_ACTIONS: Partial<Record<ReservationStatus, { label: string; next: ReservationStatus }>> = {
    confirmed: { label: 'Mark Arrived', next: 'arrived' },
    arrived: { label: 'Seat Guest', next: 'seated' },
    seated: { label: 'Complete', next: 'completed' },
  };
  const nextAction = NEXT_ACTIONS[reservation.status];

  return (
    <div
      className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-[16px] border border-white/6 bg-white/3 px-4 py-3 transition-all hover:bg-white/6"
      onClick={() => onSelect(reservation)}
    >
      {/* Time + size */}
      <div className="text-center min-w-[60px]">
        <p className="text-sm font-black text-white">{reservation.time}</p>
        <p className="text-xs text-slate-500">{reservation.partySize}p</p>
      </div>

      {/* Guest */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-white">{reservation.guestName}</p>
          {reservation.isVIP && <StarSolid className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
          {reservation.visitCount > 5 && !reservation.isVIP && (
            <span className="shrink-0 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
              {reservation.visitCount}x
            </span>
          )}
          {reservation.tags.map((tag) => (
            <span key={tag} className="shrink-0 rounded-full bg-violet-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-300">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{reservation.guestPhone}</span>
          {reservation.table && <span className="text-xs font-semibold text-cyan-400">· {reservation.table}</span>}
          {reservation.source && <span className="text-[10px] text-slate-600">{SOURCE_ICONS[reservation.source]}</span>}
        </div>
      </div>

      {/* Status chip */}
      <div className="hidden sm:block">
        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', sc.bg, sc.text)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', sc.dot)} />
          {sc.label}
        </span>
      </div>

      {/* Next action */}
      <div className="hidden md:block">
        {nextAction && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(reservation.id, nextAction.next); }}
            className="rounded-xl bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-300/20"
          >
            {nextAction.label}
          </button>
        )}
      </div>

      {/* Contact */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <a
          href={`tel:${reservation.guestPhone}`}
          className="rounded-xl p-1.5 text-slate-500 hover:bg-white/8 hover:text-white"
          title="Call guest"
        >
          <PhoneIcon className="h-4 w-4" />
        </a>
        {reservation.guestEmail && (
          <a
            href={`mailto:${reservation.guestEmail}`}
            className="rounded-xl p-1.5 text-slate-500 hover:bg-white/8 hover:text-white"
            title="Email guest"
          >
            <EnvelopeIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'upcoming' | 'waitlist' | 'completed';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(SAMPLE_RESERVATIONS);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const [showNew, setShowNew] = useState(false);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selected, setSelected] = useState<Reservation | null>(null);

  const handleStatusChange = (id: string, newStatus: ReservationStatus) => {
    setReservations((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: newStatus } : r)
    );
    toast.success(`Reservation updated to ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleSave = (partial: Partial<Reservation>) => {
    const newRes: Reservation = {
      id: String(Date.now()),
      guestName: '',
      guestPhone: '',
      partySize: 2,
      date: TODAY,
      time: '',
      status: 'confirmed',
      source: 'online',
      isVIP: false,
      visitCount: 0,
      tags: [],
      confirmationCode: '',
      ...partial,
    } as Reservation;
    setReservations((prev) => [...prev, newRes]);
    setShowNew(false);
    toast.success(`Reservation booked for ${newRes.guestName} — ${newRes.confirmationCode}`);
  };

  const filtered = useMemo(() => {
    let list = reservations.filter((r) => r.date === selectedDate);

    if (tab === 'upcoming') list = list.filter((r) => ['confirmed', 'arrived'].includes(r.status));
    else if (tab === 'waitlist') list = list.filter((r) => r.status === 'waitlist');
    else if (tab === 'completed') list = list.filter((r) => ['completed', 'no_show', 'cancelled'].includes(r.status));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.guestName.toLowerCase().includes(q) ||
        r.guestPhone.includes(q) ||
        r.confirmationCode.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations, tab, search, selectedDate]);

  const stats = {
    total: reservations.filter((r) => r.date === selectedDate && r.status !== 'waitlist').length,
    confirmed: reservations.filter((r) => r.date === selectedDate && r.status === 'confirmed').length,
    seated: reservations.filter((r) => r.date === selectedDate && r.status === 'seated').length,
    waitlist: reservations.filter((r) => r.date === selectedDate && r.status === 'waitlist').length,
    covers: reservations.filter((r) => r.date === selectedDate && r.status !== 'waitlist' && r.status !== 'cancelled').reduce((s, r) => s + r.partySize, 0),
  };

  const TABS: { id: TabFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: filtered.length },
    { id: 'upcoming', label: 'Upcoming', count: reservations.filter((r) => r.date === selectedDate && ['confirmed', 'arrived'].includes(r.status)).length },
    { id: 'waitlist', label: 'Waitlist', count: stats.waitlist },
    { id: 'completed', label: 'Done', count: reservations.filter((r) => r.date === selectedDate && ['completed', 'no_show', 'cancelled'].includes(r.status)).length },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {showNew && <NewReservationModal onClose={() => setShowNew(false)} onSave={handleSave} />}

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white">Reservations</h1>
            <p className="mt-0.5 text-sm text-slate-400">Manage bookings, waitlist, and guest flow</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
            />
            <button
              onClick={() => setShowNew(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              New Reservation
            </button>
          </div>
        </div>

        {/* ── Stats bar ─────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          {[
            { label: 'Total bookings', value: stats.total, color: 'text-white' },
            { label: 'Total covers', value: stats.covers, color: 'text-cyan-300' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-300' },
            { label: 'Currently seated', value: stats.seated, color: 'text-emerald-300' },
            { label: 'Waitlist', value: stats.waitlist, color: 'text-violet-300' },
          ].map((s) => (
            <div key={s.label} className="rounded-[16px] border border-white/8 bg-white/4 p-4">
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Tabs ──────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/6 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="Search name, phone, or confirmation code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all',
                  tab === t.id
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 text-slate-400 hover:text-white',
                )}
              >
                {t.label}
                <span className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  tab === t.id ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-400',
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Time-slot header legend ──────────────────────── */}
        <div className="mb-3 grid grid-cols-[60px_1fr_120px_140px_60px] gap-4 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
          <span>Time</span>
          <span>Guest</span>
          <span className="hidden sm:block">Status</span>
          <span className="hidden md:block">Action</span>
          <span>Contact</span>
        </div>

        {/* ── Reservation list ───────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDaysIcon className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-base font-bold text-slate-400">No reservations found</p>
            <p className="mt-1 text-sm text-slate-600">Try a different date or add a new booking above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <ReservationRow
                key={r.id}
                reservation={r}
                onStatusChange={handleStatusChange}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Guest detail side panel ──────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-sm border-l border-white/10 bg-slate-900 p-6 overflow-y-auto">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <XMarkIcon className="h-4 w-4" /> Close
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-lg font-black text-slate-950">
                {selected.guestName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{selected.guestName}</h2>
                  {selected.isVIP && <StarSolid className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="text-xs text-slate-400">{selected.visitCount} visits · {selected.confirmationCode}</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ['Time', selected.time],
                ['Party', `${selected.partySize} guests`],
                ['Table', selected.table || 'Not assigned'],
                ['Source', SOURCE_ICONS[selected.source] + ' ' + selected.source.replace('_', ' ')],
                ['Status', STATUS_CONFIG[selected.status].label],
                ['Phone', selected.guestPhone],
                ['Email', selected.guestEmail || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/4 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">{label as string}</span>
                  <span className="text-sm font-semibold text-white">{value as string}</span>
                </div>
              ))}
            </div>

            {selected.specialRequests && (
              <div className="mt-4 rounded-[16px] border border-amber-400/20 bg-amber-400/6 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">Special Requests</p>
                <p className="text-sm text-slate-200">{selected.specialRequests}</p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              {selected.status === 'confirmed' && (
                <button
                  onClick={() => { handleStatusChange(selected.id, 'arrived'); setSelected(null); }}
                  className="btn-primary w-full"
                >
                  Mark Arrived
                </button>
              )}
              {selected.status === 'arrived' && (
                <button
                  onClick={() => { handleStatusChange(selected.id, 'seated'); setSelected(null); }}
                  className="btn-primary w-full"
                >
                  Seat Guest
                </button>
              )}
              <button
                onClick={() => { handleStatusChange(selected.id, 'no_show'); setSelected(null); }}
                className="btn-danger w-full"
              >
                Mark No-Show
              </button>
              <button
                onClick={() => { handleStatusChange(selected.id, 'cancelled'); setSelected(null); }}
                className="btn-secondary w-full"
              >
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
