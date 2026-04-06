'use client';

import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  GiftIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  HeartIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface GuestProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  tier: LoyaltyTier;
  points: number;
  totalSpend: number;
  visitCount: number;
  avgCheck: number;
  lastVisit: string;
  firstVisit: string;
  birthday?: string;
  dietaryPreferences: string[];
  allergens: string[];
  favoriteItems: string[];
  preferredServer?: string;
  notes?: string;
  tags: string[];
  spendHistory: { month: string; spend: number }[];
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const GUESTS: GuestProfile[] = [
  {
    id: '1', name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '(647) 555-0142',
    tier: 'platinum', points: 4820, totalSpend: 3240, visitCount: 18, avgCheck: 180,
    lastVisit: '2026-04-02', firstVisit: '2024-08-15',
    birthday: '1988-06-14',
    dietaryPreferences: ['Pescatarian'], allergens: ['Tree nuts'],
    favoriteItems: ['Salmon Fillet', 'Caesar Salad', 'Sauvignon Blanc'],
    preferredServer: 'Jordan M.',
    notes: 'Prefers corner booth. Brings clients often — always ensure impeccable service.',
    tags: ['vip', 'corporate', 'frequent'],
    spendHistory: [
      { month: 'Oct', spend: 210 }, { month: 'Nov', spend: 185 }, { month: 'Dec', spend: 310 },
      { month: 'Jan', spend: 195 }, { month: 'Feb', spend: 220 }, { month: 'Mar', spend: 240 },
    ],
  },
  {
    id: '2', name: 'James Kauffman', email: 'james.k@corp.ca', phone: '(416) 555-0234',
    tier: 'gold', points: 2140, totalSpend: 1420, visitCount: 8, avgCheck: 177,
    lastVisit: '2026-04-05', firstVisit: '2025-02-10',
    birthday: '1992-03-22',
    dietaryPreferences: [], allergens: [],
    favoriteItems: ['Ribeye 12oz', 'Old Fashioned', 'Crème Brûlée'],
    preferredServer: 'Taylor B.',
    notes: 'Anniversary dinner regular. Has a standing request for a window table.',
    tags: ['regular', 'high-value'],
    spendHistory: [
      { month: 'Oct', spend: 0 }, { month: 'Nov', spend: 180 }, { month: 'Dec', spend: 350 },
      { month: 'Jan', spend: 0 }, { month: 'Feb', spend: 160 }, { month: 'Mar', spend: 190 },
    ],
  },
  {
    id: '3', name: 'Priya Nair', email: 'priya@techcorp.com', phone: '(905) 555-0381',
    tier: 'gold', points: 1860, totalSpend: 1240, visitCount: 7, avgCheck: 177,
    lastVisit: '2026-03-28', firstVisit: '2025-04-05',
    dietaryPreferences: ['Vegetarian'], allergens: ['Dairy'],
    favoriteItems: ['Truffle Pasta', 'Sparkling Water', 'Tiramisu'],
    notes: 'Books for corporate events. Always brings 4–6 people.',
    tags: ['corporate', 'vegetarian'],
    spendHistory: [
      { month: 'Oct', spend: 180 }, { month: 'Nov', spend: 0 }, { month: 'Dec', spend: 290 },
      { month: 'Jan', spend: 170 }, { month: 'Feb', spend: 0 }, { month: 'Mar', spend: 195 },
    ],
  },
  {
    id: '4', name: 'Marcus Thompson', phone: '(437) 555-0512',
    tier: 'silver', points: 760, totalSpend: 510, visitCount: 5, avgCheck: 102,
    lastVisit: '2026-04-06', firstVisit: '2025-10-14',
    dietaryPreferences: [], allergens: ['Shellfish'],
    favoriteItems: ['Craft Burger', 'IPA Draft', 'Loaded Fries'],
    tags: ['regular'],
    spendHistory: [
      { month: 'Oct', spend: 95 }, { month: 'Nov', spend: 110 }, { month: 'Dec', spend: 0 },
      { month: 'Jan', spend: 105 }, { month: 'Feb', spend: 98 }, { month: 'Mar', spend: 102 },
    ],
  },
  {
    id: '5', name: 'Emily Ross', email: 'emily.r@studio.io', phone: '(905) 555-0845',
    tier: 'silver', points: 1020, totalSpend: 680, visitCount: 7, avgCheck: 97,
    lastVisit: '2026-03-31', firstVisit: '2025-07-22',
    birthday: '1995-09-08',
    dietaryPreferences: ['Vegan'], allergens: [],
    favoriteItems: ['Garden Salad', 'Sparkling Water', 'Sorbet'],
    notes: 'Vegan — always check menu updates. Has recommended us to 3 friends.',
    tags: ['referral-source', 'vegan'],
    spendHistory: [
      { month: 'Oct', spend: 85 }, { month: 'Nov', spend: 92 }, { month: 'Dec', spend: 110 },
      { month: 'Jan', spend: 88 }, { month: 'Feb', spend: 95 }, { month: 'Mar', spend: 90 },
    ],
  },
  {
    id: '6', name: 'Carlos Rivera', phone: '(437) 555-0956',
    tier: 'bronze', points: 120, totalSpend: 80, visitCount: 1, avgCheck: 80,
    lastVisit: '2026-04-06', firstVisit: '2026-04-06',
    dietaryPreferences: [], allergens: [],
    favoriteItems: [],
    tags: ['new'],
    spendHistory: [
      { month: 'Oct', spend: 0 }, { month: 'Nov', spend: 0 }, { month: 'Dec', spend: 0 },
      { month: 'Jan', spend: 0 }, { month: 'Feb', spend: 0 }, { month: 'Mar', spend: 0 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<LoyaltyTier, { label: string; bg: string; text: string; border: string; min: number; max: number }> = {
  bronze:   { label: 'Bronze',   bg: 'bg-orange-900/30',  text: 'text-orange-300',  border: 'border-orange-700/30', min: 0,     max: 499 },
  silver:   { label: 'Silver',   bg: 'bg-slate-700/40',   text: 'text-slate-300',   border: 'border-slate-600/40',  min: 500,   max: 1499 },
  gold:     { label: 'Gold',     bg: 'bg-amber-900/30',   text: 'text-amber-300',   border: 'border-amber-700/30',  min: 1500,  max: 3999 },
  platinum: { label: 'Platinum', bg: 'bg-cyan-900/30',    text: 'text-cyan-300',    border: 'border-cyan-700/30',   min: 4000,  max: Infinity },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

// ─── Guest Card ───────────────────────────────────────────────────────────────

function GuestCard({ guest, onClick }: { guest: GuestProfile; onClick: () => void }) {
  const tier = TIER_CONFIG[guest.tier];
  const days = daysSince(guest.lastVisit);
  const atRisk = days > 30 && guest.visitCount > 2;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'cursor-pointer rounded-[20px] border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg',
        tier.border, tier.bg,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black', tier.bg, tier.text)}>
            {guest.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-white">{guest.name}</p>
              {guest.tier === 'platinum' && <StarSolid className="h-3.5 w-3.5 text-amber-400" />}
            </div>
            <p className="text-xs text-slate-500">{guest.visitCount} visits · {formatCurrency(guest.totalSpend)}</p>
          </div>
        </div>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]', tier.bg, tier.text)}>
          {tier.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl bg-white/5 p-2 text-center">
          <p className="text-sm font-black text-white">{guest.points.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">points</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2 text-center">
          <p className="text-sm font-black text-white">${guest.avgCheck}</p>
          <p className="text-[10px] text-slate-500">avg check</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2 text-center">
          <p className={clsx('text-sm font-black', atRisk ? 'text-red-400' : 'text-white')}>{days}d</p>
          <p className="text-[10px] text-slate-500">since visit</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {atRisk && (
          <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-bold text-red-300">At Risk</span>
        )}
        {guest.dietaryPreferences.map((d) => (
          <span key={d} className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{d}</span>
        ))}
        {guest.allergens.map((a) => (
          <span key={a} className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-400">⚠ {a}</span>
        ))}
        {guest.tags.map((t) => (
          <span key={t} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Guest Detail Panel ───────────────────────────────────────────────────────

function GuestDetail({ guest, onClose }: { guest: GuestProfile; onClose: () => void }) {
  const tier = TIER_CONFIG[guest.tier];
  const nextTierKey = guest.tier === 'bronze' ? 'silver' : guest.tier === 'silver' ? 'gold' : guest.tier === 'gold' ? 'platinum' : null;
  const nextTier = nextTierKey ? TIER_CONFIG[nextTierKey] : null;
  const pointsToNext = nextTier ? nextTier.min - guest.points : 0;
  const progressPct = nextTier ? Math.min(100, ((guest.points - TIER_CONFIG[guest.tier].min) / (nextTier.min - TIER_CONFIG[guest.tier].min)) * 100) : 100;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md border-l border-white/10 bg-slate-900 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <h2 className="text-base font-bold text-white">Guest Profile</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-white/8 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className={clsx('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black', tier.bg, tier.text)}>
              {guest.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">{guest.name}</h3>
                {guest.tier === 'platinum' && <StarSolid className="h-5 w-5 text-amber-400" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={clsx('rounded-full px-3 py-0.5 text-xs font-black uppercase', tier.bg, tier.text)}>
                  {tier.label}
                </span>
                <span className="text-xs text-slate-500">Member since {new Date(guest.firstVisit).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-[16px] border border-white/8 bg-white/4 divide-y divide-white/6">
            {[
              { icon: PhoneIcon, label: 'Phone', value: guest.phone },
              { icon: EnvelopeIcon, label: 'Email', value: guest.email || '—' },
              { icon: CalendarDaysIcon, label: 'Birthday', value: guest.birthday ? new Date(guest.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="text-xs text-slate-500 w-14 shrink-0">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Loyalty */}
          <div className="rounded-[16px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Loyalty Status</p>
              <p className={clsx('text-lg font-black', tier.text)}>{guest.points.toLocaleString()} pts</p>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            {nextTier && (
              <p className="text-xs text-slate-500">
                {pointsToNext > 0 ? `${pointsToNext.toLocaleString()} points to ${nextTier.label}` : `${tier.label} status active`}
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Total Spend', value: formatCurrency(guest.totalSpend) },
                { label: 'Visits', value: guest.visitCount },
                { label: 'Avg Check', value: `$${guest.avgCheck}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white/6 p-2 text-center">
                  <p className="text-sm font-black text-white">{value}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Spend chart */}
          <div className="rounded-[16px] border border-white/8 bg-white/4 p-4">
            <p className="mb-4 text-sm font-bold text-white">Spend History (6 months)</p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={guest.spendHistory}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`$${v}`, 'Spend']}
                  labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="spend" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Preferences */}
          {(guest.dietaryPreferences.length > 0 || guest.allergens.length > 0) && (
            <div className="rounded-[16px] border border-amber-400/20 bg-amber-400/6 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">Dietary & Allergies</p>
              <div className="flex flex-wrap gap-2">
                {guest.dietaryPreferences.map((d) => (
                  <span key={d} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">✓ {d}</span>
                ))}
                {guest.allergens.map((a) => (
                  <span key={a} className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-bold text-red-300">⚠ {a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {guest.favoriteItems.length > 0 && (
            <div className="rounded-[16px] border border-white/8 bg-white/4 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Favorite Items</p>
              <div className="flex flex-wrap gap-2">
                {guest.favoriteItems.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-200">
                    ❤ {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {guest.notes && (
            <div className="rounded-[16px] border border-white/8 bg-white/4 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Staff Notes</p>
              <p className="text-sm leading-relaxed text-slate-300">{guest.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button className="btn-primary w-full flex items-center justify-center gap-2">
              <GiftIcon className="h-4 w-4" /> Send Reward / Voucher
            </button>
            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" /> Book Reservation
            </button>
            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <EnvelopeIcon className="h-4 w-4" /> Send Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TierFilter = 'all' | LoyaltyTier | 'at_risk';

export default function GuestsPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selected, setSelected] = useState<GuestProfile | null>(null);
  const [sortBy, setSortBy] = useState<'lastVisit' | 'totalSpend' | 'visitCount'>('lastVisit');

  const filtered = useMemo(() => {
    let list = GUESTS;

    if (tierFilter === 'at_risk') {
      list = list.filter((g) => daysSince(g.lastVisit) > 30 && g.visitCount > 2);
    } else if (tierFilter !== 'all') {
      list = list.filter((g) => g.tier === tierFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.email?.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'lastVisit') return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      if (sortBy === 'totalSpend') return b.totalSpend - a.totalSpend;
      return b.visitCount - a.visitCount;
    });
  }, [search, tierFilter, sortBy]);

  const stats = {
    total: GUESTS.length,
    platinum: GUESTS.filter((g) => g.tier === 'platinum').length,
    atRisk: GUESTS.filter((g) => daysSince(g.lastVisit) > 30 && g.visitCount > 2).length,
    totalLTV: GUESTS.reduce((s, g) => s + g.totalSpend, 0),
    totalPoints: GUESTS.reduce((s, g) => s + g.points, 0),
  };

  const TIER_FILTERS: { id: TierFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Guests', count: GUESTS.length },
    { id: 'platinum', label: '✦ Platinum', count: GUESTS.filter((g) => g.tier === 'platinum').length },
    { id: 'gold', label: 'Gold', count: GUESTS.filter((g) => g.tier === 'gold').length },
    { id: 'silver', label: 'Silver', count: GUESTS.filter((g) => g.tier === 'silver').length },
    { id: 'bronze', label: 'Bronze', count: GUESTS.filter((g) => g.tier === 'bronze').length },
    { id: 'at_risk', label: '⚠ At Risk', count: stats.atRisk },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {selected && <GuestDetail guest={selected} onClose={() => setSelected(null)} />}

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white">Guest Intelligence</h1>
            <p className="mt-0.5 text-sm text-slate-400">CRM profiles, loyalty tiers, and spend intelligence</p>
          </div>
          <button className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
            <PlusIcon className="h-4 w-4" /> Add Guest
          </button>
        </div>

        {/* ── KPI Stats ─────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Total Guests', value: stats.total, color: 'text-white' },
            { label: 'Total LTV', value: formatCurrency(stats.totalLTV), color: 'text-emerald-300' },
            { label: 'Platinum Members', value: stats.platinum, color: 'text-cyan-300' },
            { label: 'At-Risk Guests', value: stats.atRisk, color: stats.atRisk > 0 ? 'text-red-400' : 'text-slate-400' },
            { label: 'Points in Circulation', value: stats.totalPoints.toLocaleString(), color: 'text-amber-300' },
          ].map((s) => (
            <div key={s.label} className="rounded-[16px] border border-white/8 bg-white/4 p-4">
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Loyalty Tier Breakdown ─────────────────────────── */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          {(['platinum', 'gold', 'silver', 'bronze'] as LoyaltyTier[]).map((tier) => {
            const config = TIER_CONFIG[tier];
            const count = GUESTS.filter((g) => g.tier === tier).length;
            const ltv = GUESTS.filter((g) => g.tier === tier).reduce((s, g) => s + g.totalSpend, 0);
            return (
              <div key={tier} className={clsx('rounded-[16px] border p-4', config.border, config.bg)}>
                <p className={clsx('text-sm font-black uppercase tracking-[0.14em]', config.text)}>{config.label}</p>
                <p className="mt-2 text-2xl font-black text-white">{count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(ltv)} LTV</p>
              </div>
            );
          })}
        </div>

        {/* ── Filters + Search ──────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/6 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="lastVisit">Sort: Recent Visit</option>
            <option value="totalSpend">Sort: Total Spend</option>
            <option value="visitCount">Sort: Visit Count</option>
          </select>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTierFilter(f.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all',
                tierFilter === f.id
                  ? 'bg-cyan-300 text-slate-950'
                  : 'border border-white/10 text-slate-400 hover:text-white',
              )}
            >
              {f.label}
              <span className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                tierFilter === f.id ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-400',
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Guest Grid ────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserGroupIcon className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-base font-bold text-slate-400">No guests found</p>
            <p className="mt-1 text-sm text-slate-600">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((guest) => (
              <GuestCard key={guest.id} guest={guest} onClick={() => setSelected(guest)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
