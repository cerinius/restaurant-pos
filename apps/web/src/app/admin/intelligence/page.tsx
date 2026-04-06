'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type InsightSeverity = 'info' | 'warning' | 'success' | 'alert';
type InsightCategory = 'REVENUE' | 'LABOR' | 'MENU' | 'GUEST' | 'OPS' | 'FORECAST';

interface AIInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  body: string;
  action?: string;
  time: string;
  impact?: string;
}

// ─── Mock AI insights (in production these come from the AI engine) ──────────

const PULSE_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    category: 'FORECAST',
    severity: 'warning',
    title: 'High demand predicted this Friday 7–9pm',
    body: 'Based on 12 weeks of historical data, reservation pace, and local events, covers are projected at +34% above your Friday average. Current staffing is likely insufficient.',
    action: 'Add 2 servers and 1 line cook',
    time: '2 minutes ago',
    impact: '+$1,200 revenue risk',
  },
  {
    id: '2',
    category: 'MENU',
    severity: 'success',
    title: 'Ribeye is outperforming — feature it tonight',
    body: 'Ribeye order velocity is up 22% this week vs. the rolling 4-week average. Featuring it as a nightly special could add 8–12 additional orders.',
    action: 'Mark as Featured in Menu',
    time: '6 minutes ago',
    impact: '+$320 estimated revenue',
  },
  {
    id: '3',
    category: 'REVENUE',
    severity: 'alert',
    title: 'Tuesday revenue is 18% below baseline',
    body: 'Last 3 Tuesdays have underperformed vs. the 8-week average. A targeted campaign to lapsed guests (14–28 day gap) has historically recovered 60–70% of the variance.',
    action: 'Auto-launch Tuesday campaign',
    time: '14 minutes ago',
    impact: '$840 weekly gap',
  },
  {
    id: '4',
    category: 'GUEST',
    severity: 'info',
    title: '3 VIP guests dining tonight — prep is recommended',
    body: 'Sarah M. (12 visits, $3,200 LTV), James K. (8 visits, avg $180/check), and Priya N. (VIP birthday this week) have active reservations tonight.',
    action: 'View VIP Prep Notes',
    time: '22 minutes ago',
    impact: 'Loyalty retention',
  },
  {
    id: '5',
    category: 'LABOR',
    severity: 'warning',
    title: 'Labor cost on track to exceed 32% today',
    body: 'Current clock-in data projects 34.2% labor cost. The variance is driven by 2 overtime situations from this morning\'s brunch shift.',
    action: 'Review schedule adjustments',
    time: '31 minutes ago',
    impact: '+$240 labor over budget',
  },
  {
    id: '6',
    category: 'OPS',
    severity: 'info',
    title: 'Table 14 turn time is trending long this week',
    body: 'Average turn time for Table 14 is 94 minutes vs. your 72-minute section target. Check section assignment or consider a workflow prompt for servers.',
    action: 'View table analytics',
    time: '45 minutes ago',
    impact: '~18% cover loss potential',
  },
];

const DEMAND_FORECAST = [
  { day: 'Mon', predicted: 82, actual: 79 },
  { day: 'Tue', predicted: 61, actual: 58 },
  { day: 'Wed', predicted: 74, actual: 71 },
  { day: 'Thu', predicted: 95, actual: 92 },
  { day: 'Fri', predicted: 134, actual: null },
  { day: 'Sat', predicted: 148, actual: null },
  { day: 'Sun', predicted: 110, actual: null },
];

const REVENUE_TREND = [
  { hour: '11am', revenue: 240 },
  { hour: '12pm', revenue: 890 },
  { hour: '1pm', revenue: 1240 },
  { hour: '2pm', revenue: 620 },
  { hour: '3pm', revenue: 180 },
  { hour: '4pm', revenue: 320 },
  { hour: '5pm', revenue: 780 },
  { hour: '6pm', revenue: 1560 },
  { hour: '7pm', revenue: 2100 },
  { hour: '8pm', revenue: 1840 },
  { hour: '9pm', revenue: 1120 },
];

const TOP_ITEMS = [
  { name: 'Ribeye 12oz', velocity: 94, trend: 22, revenue: 4230 },
  { name: 'Salmon Fillet', velocity: 82, trend: 8, revenue: 3120 },
  { name: 'Craft Burger', velocity: 78, trend: -4, revenue: 2340 },
  { name: 'Truffle Pasta', velocity: 71, trend: 15, revenue: 2840 },
  { name: 'Caesar Salad', velocity: 68, trend: 3, revenue: 1360 },
];

const STAFF_PERFORMANCE = [
  { name: 'Jordan M.', avgCheck: 92, covers: 142, upsellRate: 68, score: 94 },
  { name: 'Taylor B.', avgCheck: 87, covers: 138, upsellRate: 62, score: 89 },
  { name: 'Alex R.', avgCheck: 76, covers: 155, upsellRate: 54, score: 82 },
  { name: 'Casey L.', avgCheck: 71, covers: 129, upsellRate: 48, score: 76 },
  { name: 'Morgan S.', avgCheck: 65, covers: 118, upsellRate: 40, score: 68 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<InsightSeverity, { bg: string; border: string; badge: string; icon: string }> = {
  info: { bg: 'bg-blue-400/6', border: 'border-blue-400/20', badge: 'bg-blue-400/20 text-blue-300', icon: 'text-blue-400' },
  success: { bg: 'bg-emerald-400/6', border: 'border-emerald-400/20', badge: 'bg-emerald-400/20 text-emerald-300', icon: 'text-emerald-400' },
  warning: { bg: 'bg-amber-400/6', border: 'border-amber-400/20', badge: 'bg-amber-400/20 text-amber-300', icon: 'text-amber-400' },
  alert: { bg: 'bg-red-400/6', border: 'border-red-400/20', badge: 'bg-red-400/20 text-red-300', icon: 'text-red-400' },
};

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  REVENUE: 'Revenue',
  LABOR: 'Labor',
  MENU: 'Menu',
  GUEST: 'Guest',
  OPS: 'Operations',
  FORECAST: 'Forecast',
};

function InsightCard({ insight }: { insight: AIInsight }) {
  const styles = SEVERITY_STYLES[insight.severity];
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={clsx('rounded-[20px] border p-5 transition-all', styles.bg, styles.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]', styles.badge)}>
            {CATEGORY_LABELS[insight.category]}
          </span>
          {insight.impact && (
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {insight.impact}
            </span>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-slate-600 hover:text-slate-400 text-sm"
        >
          ×
        </button>
      </div>
      <h4 className="mt-2.5 text-sm font-bold text-white">{insight.title}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{insight.body}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {insight.action && (
          <button className="rounded-xl bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/14 transition-colors">
            {insight.action} →
          </button>
        )}
        <span className="text-[10px] text-slate-500 ml-auto">{insight.time}</span>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type FilterTab = 'all' | InsightCategory;

export default function IntelligencePage() {
  const today = new Date().toISOString().split('T')[0];
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const { data: salesData } = useQuery({
    queryKey: ['sales-report', today],
    queryFn: () => api.getSalesReport({ dateFrom: today, dateTo: today }),
  });

  const filteredInsights = activeFilter === 'all'
    ? PULSE_INSIGHTS
    : PULSE_INSIGHTS.filter((i) => i.category === activeFilter);

  const kpis = [
    {
      label: 'AI Insights Today',
      value: '18',
      sub: '6 require action',
      icon: CpuChipIcon,
      color: 'text-cyan-400',
      glow: 'shadow-[0_0_30px_rgba(34,211,238,0.12)]',
    },
    {
      label: 'Revenue Forecast',
      value: '$12,400',
      sub: '+11% vs last week',
      icon: ArrowTrendingUpIcon,
      color: 'text-emerald-400',
      glow: 'shadow-[0_0_30px_rgba(52,211,153,0.10)]',
    },
    {
      label: 'Labor Cost (live)',
      value: '29.4%',
      sub: 'Target: ≤30%',
      icon: UserGroupIcon,
      color: 'text-amber-400',
      glow: 'shadow-[0_0_30px_rgba(251,191,36,0.10)]',
    },
    {
      label: 'Anomalies Detected',
      value: '3',
      sub: '2 resolved, 1 open',
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      glow: 'shadow-[0_0_30px_rgba(248,113,113,0.10)]',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[0_8px_30px_rgba(34,211,238,0.3)]">
              <CpuChipIcon className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">PULSE AI™ Intelligence</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </span>
                <span className="text-xs text-slate-400">Live · Last updated 2 minutes ago</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            AI Active
          </span>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={clsx(
              'rounded-[20px] border border-white/8 bg-white/4 p-5',
              kpi.glow,
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{kpi.label}</p>
              <kpi.icon className={clsx('h-4 w-4', kpi.color)} />
            </div>
            <p className={clsx('text-3xl font-black', kpi.color)}>{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="mb-8 grid gap-5 xl:grid-cols-2">
        {/* Demand Forecast */}
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">7-Day Demand Forecast</h3>
              <p className="text-xs text-slate-400 mt-0.5">AI-predicted covers vs. actual</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">94% accuracy</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEMAND_FORECAST} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, fontSize: 12 }}
                itemStyle={{ color: '#cbd5e1' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
              />
              <Bar dataKey="actual" fill="rgba(52,211,153,0.6)" radius={[6, 6, 0, 0]} name="Actual" />
              <Bar dataKey="predicted" fill="rgba(34,211,238,0.4)" radius={[6, 6, 0, 0]} name="Predicted" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-500">Fri–Sun: forecast only. Based on 12-week rolling model.</p>
        </div>

        {/* Revenue by Hour */}
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Revenue by Hour — Today</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live accumulation</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_TREND}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: any) => [`$${v}`, 'Revenue']}
                labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Menu Velocity + Staff Performance ───────────────────── */}
      <div className="mb-8 grid gap-5 xl:grid-cols-2">
        {/* Item velocity */}
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6">
          <h3 className="mb-5 text-base font-bold text-white">Top Item Velocity (This Week)</h3>
          <div className="space-y-3">
            {TOP_ITEMS.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-slate-500">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className={clsx(
                        'flex items-center gap-0.5 text-xs font-bold',
                        item.trend > 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {item.trend > 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                        {Math.abs(item.trend)}%
                      </span>
                      <span className="text-xs text-slate-500">${item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300"
                      style={{ width: `${item.velocity}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff performance */}
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6">
          <h3 className="mb-5 text-base font-bold text-white">Staff Performance Index</h3>
          <div className="space-y-3">
            {STAFF_PERFORMANCE.map((staff, i) => (
              <div key={staff.name} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-xs font-black text-cyan-300">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{staff.name}</span>
                    <span className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-black',
                      staff.score >= 90 ? 'bg-emerald-400/15 text-emerald-300' :
                      staff.score >= 80 ? 'bg-cyan-400/15 text-cyan-300' :
                      staff.score >= 70 ? 'bg-amber-400/15 text-amber-300' : 'bg-red-400/15 text-red-300',
                    )}>
                      {staff.score} pts
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>Avg check ${staff.avgCheck}</span>
                    <span>·</span>
                    <span>{staff.covers} covers</span>
                    <span>·</span>
                    <span>{staff.upsellRate}% upsell</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Insights Feed ────────────────────────────────────── */}
      <div className="rounded-[24px] border border-white/8 bg-white/4 p-6">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Live AI Insights</h3>
            <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
              {PULSE_INSIGHTS.length} today
            </span>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'FORECAST', 'REVENUE', 'LABOR', 'MENU', 'GUEST', 'OPS'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={clsx(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  activeFilter === tab
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 text-slate-400 hover:text-white',
                )}
              >
                {tab === 'all' ? 'All' : CATEGORY_LABELS[tab as InsightCategory]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
