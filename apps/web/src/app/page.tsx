import Link from 'next/link';
import { Manrope, Space_Grotesk } from 'next/font/google';

import { LandingWarmupStatus } from '@/components/landing/LandingWarmupStatus';
import { getRestaurantPublicPath } from '@/lib/paths';

const bodyFont = Manrope({ subsets: ['latin'] });
const displayFont = Space_Grotesk({ subsets: ['latin'] });

const FEATURE_PILLARS = [
  {
    icon: '🧠',
    badge: 'PULSE AI™',
    title: 'Your restaurant gets smarter every shift',
    body: 'Real-time AI analyzes every order, table turn, and staff move — then surfaces recommendations before problems happen. Predict your busiest hour 3 days out. Know which server is going to burn out before the shift ends.',
    highlight: true,
  },
  {
    icon: '🗓️',
    badge: 'Reservations',
    title: 'OpenTable-level reservations, built right in',
    body: 'No third-party fees. Full reservation management with automated confirmations, waitlist intelligence, guest history, and two-way SMS — all connected to your live floor.',
    highlight: false,
  },
  {
    icon: '👥',
    badge: 'Guest Intelligence',
    title: 'Know every guest before they sit down',
    body: 'CRM-grade guest profiles: dietary preferences, birthday, average spend, visit frequency, favorite server. Loyalty points that actually drive return visits. Personalized upsells at the table.',
    highlight: false,
  },
  {
    icon: '📅',
    badge: 'SmartSchedule™',
    title: 'Staff scheduling that writes itself',
    body: 'AI-driven scheduling combines your reservation book, historical covers, and labor cost targets to suggest the optimal schedule. Drag-drop refinement, clock-in/out, and tip pooling — one place.',
    highlight: false,
  },
  {
    icon: '🍽️',
    badge: 'Floor & POS',
    title: 'The fastest POS your servers will ever use',
    body: 'Multi-room floor plans, bar geometry, live section assignments, and an order screen optimized for the rush. Fire courses, split checks, QR pay, and custom KDS routing — all in one touch.',
    highlight: false,
  },
  {
    icon: '📣',
    badge: 'Marketing',
    title: 'Fill seats with automated campaigns',
    body: 'SMS and email campaigns triggered by guest behavior. Slow Tuesday? Auto-fire a happy hour push to guests who visited last month. Reward your best guests without lifting a finger.',
    highlight: false,
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$149',
    cadence: '/ location / month',
    badge: 'Get running fast',
    color: 'border-white/10 bg-white/4',
    features: [
      'Full POS with KDS routing',
      'Floor plan builder (unlimited rooms)',
      'Menu management & modifiers',
      'Discounts, combos & happy hours',
      'Basic reporting & audit log',
      'Up to 10 staff, 2 managers',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$279',
    cadence: '/ location / month',
    badge: 'Most popular',
    color: 'border-cyan-400/30 bg-gradient-to-b from-cyan-400/10 to-slate-950/60 shadow-[0_40px_120px_rgba(34,211,238,0.18)]',
    featured: true,
    features: [
      'Everything in Starter',
      'PULSE AI™ insights & recommendations',
      'Reservations + waitlist management',
      'Guest Intelligence (CRM + loyalty)',
      'SmartSchedule™ workforce',
      'Marketing campaigns (SMS & email)',
      'Up to 40 staff, 8 managers',
      'Priority support + success manager',
    ],
  },
  {
    name: 'Empire',
    price: '$499',
    cadence: '/ location / month',
    badge: 'Multi-location',
    color: 'border-amber-400/20 bg-white/4',
    features: [
      'Everything in Growth',
      'Multi-location command center',
      'Cross-location reporting & benchmarks',
      'Branded guest-facing website',
      'API access & custom integrations',
      'Unlimited staff & managers',
      'Dedicated implementation team',
      'SLA-backed uptime guarantee',
    ],
  },
];

const COMPARISON_ROWS = [
  {
    label: 'AI-powered insights',
    pos: '✦ PULSE AI™ built-in',
    toast: 'Add-on / limited',
    square: '—',
    openTable: 'Partial (reservations only)',
    shifts: '—',
  },
  {
    label: 'Reservations included',
    pos: '✦ Full system, no extra fee',
    toast: 'Integration required',
    square: 'No',
    openTable: '✦ Core product',
    shifts: '—',
  },
  {
    label: 'Guest loyalty / CRM',
    pos: '✦ Built-in, zero add-on cost',
    toast: 'Paid add-on',
    square: 'Basic loyalty only',
    openTable: 'Partial',
    shifts: '—',
  },
  {
    label: 'Staff scheduling',
    pos: '✦ SmartSchedule™ with AI',
    toast: 'No',
    square: 'No',
    openTable: 'No',
    shifts: '✦ Core product',
  },
  {
    label: 'Marketing campaigns',
    pos: '✦ Included, behavior-triggered',
    toast: 'Paid add-on',
    square: 'Paid add-on',
    openTable: 'Separate product',
    shifts: '—',
  },
  {
    label: 'Floor plan editor',
    pos: '✦ Visual, multi-room, bar-aware',
    toast: '✦ Strong',
    square: 'Basic',
    openTable: 'Table map only',
    shifts: 'Section view only',
  },
  {
    label: 'Hardware-free option',
    pos: '✦ 100% web-native',
    toast: 'Hardware required',
    square: 'Hardware required',
    openTable: 'Web-based',
    shifts: 'Web-based',
  },
  {
    label: 'Single platform pricing',
    pos: '✦ One bill, everything included',
    toast: 'Module-based fees',
    square: 'Module-based fees',
    openTable: 'Per-cover fees',
    shifts: 'Per-employee fees',
  },
];

const TESTIMONIALS = [
  {
    quote: "We replaced Toast, 7Shifts, and OpenTable with one subscription. The savings alone paid for the first year.",
    author: 'Marcus T.',
    role: 'Owner, Ember & Oak (3 locations)',
    avatar: 'MT',
  },
  {
    quote: "PULSE AI flagged a Thursday revenue dip 4 weeks before I noticed it myself. That feature alone is worth the upgrade.",
    author: 'Priya S.',
    role: 'General Manager, The Saffron Room',
    avatar: 'PS',
  },
  {
    quote: "The reservation system converted 40% of our walkins into loyalty members in the first month. Game changer.",
    author: 'Carlos R.',
    role: 'F&B Director, Casa Meridian',
    avatar: 'CR',
  },
];

const STATS = [
  { value: '3.2×', label: 'faster table turns vs. industry average' },
  { value: '28%', label: 'average labor cost reduction with SmartSchedule™' },
  { value: '$4,800', label: 'average monthly savings replacing multiple tools' },
  { value: '99.97%', label: 'platform uptime SLA on Empire plan' },
];

export default function HomePage() {
  return (
    <main className={`${bodyFont.className} overflow-x-hidden`}>
      {/* ─── WARMUP ─────────────────────────────────────────────── */}
      <LandingWarmupStatus />

      {/* ─── HERO ───────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 text-center">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-cyan-400/8 blur-[120px]" />
          <div className="absolute left-[10%] top-[30%] h-[400px] w-[400px] rounded-full bg-amber-400/6 blur-[100px]" />
          <div className="absolute right-[5%] top-[20%] h-[350px] w-[350px] rounded-full bg-violet-400/6 blur-[100px]" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
          </span>
          The All-in-One Restaurant OS
        </div>

        <h1 className={`${displayFont.className} mx-auto mt-8 max-w-5xl text-5xl font-black leading-[1.08] text-white sm:text-6xl lg:text-7xl`}>
          Run your entire restaurant
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
            from one intelligent platform
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-xl leading-8 text-slate-300">
          RestaurantOS replaces your POS, scheduling app, reservation system, loyalty platform, and marketing tools
          — with AI built into every layer. One subscription. One login. Everything connected.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/demo" className="btn-primary px-8 py-4 text-base">
            Start 7-day free trial
          </Link>
          <Link href="/contact-sales" className="btn-secondary px-8 py-4 text-base">
            Talk to sales
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-500">No credit card required · Setup in under 10 minutes · Cancel anytime</p>

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-5xl grid-cols-2 gap-4 rounded-[32px] border border-white/10 bg-white/4 p-6 backdrop-blur lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.value} className="flex flex-col items-center gap-1 px-4 py-2">
              <span className={`${displayFont.className} text-3xl font-black text-cyan-300`}>{stat.value}</span>
              <span className="text-xs leading-relaxed text-slate-400">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURE PILLARS ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">What's inside</p>
          <h2 className={`${displayFont.className} mx-auto mt-4 max-w-3xl text-4xl font-black text-white sm:text-5xl`}>
            Five tools in one. Zero integrations.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Every feature is built to talk to every other feature. When PULSE AI sees a busy Friday coming, it
            automatically suggests schedule changes, preps your reservation slots, and queues a campaign to fill the 8pm gaps.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FEATURE_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className={`relative overflow-hidden rounded-[28px] border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)] ${
                pillar.highlight
                  ? 'border-cyan-400/30 bg-gradient-to-br from-cyan-400/12 via-slate-900/80 to-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.14)]'
                  : 'border-white/8 bg-white/4'
              }`}
            >
              {pillar.highlight && (
                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.08),transparent_60%)]" />
              )}
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl">{pillar.icon}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                  pillar.highlight ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-300'
                }`}>
                  {pillar.badge}
                </span>
                {pillar.highlight && (
                  <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                    Unique
                  </span>
                )}
              </div>
              <h3 className={`${displayFont.className} text-xl font-bold text-white`}>{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PULSE AI SPOTLIGHT ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="overflow-hidden rounded-[40px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,15,30,0.96),rgba(2,6,23,0.98))] p-10 shadow-[0_60px_160px_rgba(34,211,238,0.1)]">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
                <span className="text-lg">🧠</span> PULSE AI™ — Only in RestaurantOS
              </span>
              <h2 className={`${displayFont.className} mt-6 text-4xl font-black text-white sm:text-5xl`}>
                The AI brain that never clocks out
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                PULSE AI™ runs continuously in the background, learning your restaurant's patterns and surfacing
                actionable intelligence — not just dashboards.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ['Demand forecasting', '3-day cover predictions with 94% accuracy, synced to your schedule'],
                  ['Revenue anomaly detection', 'Instant alerts when sales deviate from baseline — before end of day'],
                  ['Smart upsell triggers', 'Personalized server prompts based on table history and item velocity'],
                  ['Labor cost optimizer', 'Real-time labor % with automated schedule adjustment suggestions'],
                  ['Guest sentiment scoring', 'Aggregates feedback signals and flags at-risk guest relationships'],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-[10px] font-black text-slate-950">✓</span>
                    <div>
                      <span className="text-sm font-bold text-white">{title as string}</span>
                      <span className="text-sm text-slate-400"> — {desc as string}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/demo" className="btn-primary inline-flex px-6 py-3">
                  See PULSE AI in action →
                </Link>
              </div>
            </div>

            {/* Live AI feed mockup */}
            <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  </span>
                  <span className="text-sm font-bold text-cyan-300">PULSE AI™ Live Feed</span>
                </div>
                <span className="text-xs text-slate-500">Just now</span>
              </div>

              <div className="space-y-3">
                {[
                  { color: 'bg-amber-400', icon: '⚡', text: 'High demand predicted Friday 7–9pm (+34% vs last week). Consider adding 2 servers.', time: '1m ago', type: 'FORECAST' },
                  { color: 'bg-emerald-400', icon: '📈', text: 'Ribeye is trending +22% this week. Flag as featured on tonight\'s menu.', time: '4m ago', type: 'MENU' },
                  { color: 'bg-violet-400', icon: '💬', text: 'Guest Sarah M. visited 3× this month. She\'s VIP loyalty tier — remind host to acknowledge.', time: '8m ago', type: 'GUEST' },
                  { color: 'bg-red-400', icon: '⚠️', text: 'Table 12 has been occupied 94 minutes. Average turn time is 72 min. Check in.', time: '12m ago', type: 'OPS' },
                  { color: 'bg-cyan-400', icon: '💡', text: 'Tuesday revenue is 18% below baseline. Auto-campaign queued for 11am push.', time: '18m ago', type: 'REVENUE' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/4 p-3">
                    <span className="text-base">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${item.color} bg-opacity-20 text-white`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.time}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">Roles</p>
          <h2 className={`${displayFont.className} mx-auto mt-4 max-w-2xl text-4xl font-black text-white sm:text-5xl`}>
            Built for every person in the building
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              role: 'Owner / Operator',
              emoji: '👤',
              color: 'from-violet-400/10',
              points: [
                'Multi-location command center with consolidated P&L',
                'PULSE AI™ revenue alerts and opportunity flags',
                'Staff performance benchmarks and labor cost targets',
                'Branded guest website with reservations & ordering',
              ],
            },
            {
              role: 'General Manager',
              emoji: '🎯',
              color: 'from-cyan-400/10',
              points: [
                'Live floor with section assignments and table status',
                'SmartSchedule™ with one-click coverage adjustments',
                'Approval workflows for voids, discounts, and overrides',
                'Daily briefing email powered by PULSE AI™',
              ],
            },
            {
              role: 'Server / Bartender',
              emoji: '🍷',
              color: 'from-emerald-400/10',
              points: [
                'Fast touch POS optimized for full-service flow',
                'Guest preference cards shown before order entry',
                'Loyalty point balance and redemption at checkout',
                'Course firing, split checks, QR pay — all one screen',
              ],
            },
            {
              role: 'Host',
              emoji: '🚪',
              color: 'from-amber-400/10',
              points: [
                'Reservation & waitlist management in real time',
                'Live floor occupancy with section awareness',
                'Guest arrival SMS with two-way confirmation',
                'VIP flags and special requests visible on arrival',
              ],
            },
            {
              role: 'Kitchen / Expo',
              emoji: '🔥',
              color: 'from-red-400/10',
              points: [
                'Station-specific KDS with elapsed timers',
                'Rush mode, course firing, and bump flow',
                'Allergy and modifier highlights on every ticket',
                'Live 86 updates that sync instantly to POS',
              ],
            },
            {
              role: 'Marketing Manager',
              emoji: '📣',
              color: 'from-pink-400/10',
              points: [
                'Behavior-triggered campaigns (SMS & email)',
                'Loyalty program with custom tiers and rewards',
                'Guest segmentation by spend, frequency, or visit gap',
                'Campaign performance analytics with revenue attribution',
              ],
            },
          ].map((card) => (
            <div key={card.role} className={`rounded-[24px] border border-white/8 bg-gradient-to-b ${card.color} to-transparent p-6`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{card.emoji}</span>
                <h3 className={`${displayFont.className} text-lg font-bold text-white`}>{card.role}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {card.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 shrink-0 text-cyan-400">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">Social proof</p>
          <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white`}>
            Operators who made the switch
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="rounded-[24px] border border-white/8 bg-white/4 p-7">
              <p className="text-lg leading-relaxed text-slate-200">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300 text-sm font-black text-slate-950">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.author}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ─────────────────────────────────────────── */}
      <section id="compare" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">Comparison</p>
          <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
            One platform vs. five subscriptions
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Most restaurants pay for Toast + 7Shifts + OpenTable + a loyalty app + a marketing tool. That's $800–$1,400/month before transaction fees. RestaurantOS replaces all of it.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/4 backdrop-blur">
          <div className="grid grid-cols-6 border-b border-white/10 bg-black/20 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <div className="col-span-2">Feature</div>
            <div className="text-cyan-400">RestaurantOS</div>
            <div>Toast</div>
            <div>Square + 7Shifts</div>
            <div>OpenTable</div>
          </div>
          {COMPARISON_ROWS.map((row, i) => (
            <div key={row.label} className={`grid grid-cols-6 border-b border-white/5 px-6 py-4 text-sm last:border-b-0 ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
              <div className="col-span-2 font-semibold text-white">{row.label}</div>
              <div className="font-semibold text-cyan-200">{row.pos}</div>
              <div className="text-slate-400">{row.toast}</div>
              <div className="text-slate-400">{row.square}</div>
              <div className="text-slate-400">{row.openTable}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Comparison based on public product pages reviewed April 2026. ✦ = native, included feature.
        </p>
      </section>

      {/* ─── PRICING ────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">Pricing</p>
          <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white`}>
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-slate-400">No transaction fees. No per-cover charges. No surprise add-ons.</p>
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[32px] border p-8 ${plan.color}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-300 px-5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.4)]">
                  {plan.badge}
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <h3 className={`${displayFont.className} text-3xl font-black text-white`}>{plan.name}</h3>
                {!plan.featured && (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400">{plan.badge}</span>
                )}
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className={`${displayFont.className} text-5xl font-black text-white`}>{plan.price}</span>
                <span className="pb-2 text-sm text-slate-400">{plan.cadence}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <span className="mt-0.5 shrink-0 text-cyan-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/demo"
                className={`mt-8 block rounded-2xl px-6 py-3.5 text-center text-sm font-bold transition-all ${
                  plan.featured
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.3)] hover:bg-cyan-200'
                    : 'border border-white/10 bg-white/6 text-slate-100 hover:bg-white/12'
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-8">
        <div className="overflow-hidden rounded-[40px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(7,17,31,0.97),rgba(245,158,11,0.12))] p-12 text-center shadow-[0_40px_120px_rgba(2,6,23,0.6)]">
          <span className="text-5xl">🚀</span>
          <h2 className={`${displayFont.className} mx-auto mt-6 max-w-3xl text-4xl font-black text-white sm:text-5xl`}>
            Your restaurant's smartest hire costs $149/month
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Start a 7-day trial. No credit card. Full access to every feature. See PULSE AI™ analyze your first day of real sales data.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/demo" className="btn-primary px-10 py-4 text-base">
              Start free trial — no card required
            </Link>
            <Link href="/contact-sales" className="btn-secondary px-10 py-4 text-base">
              Book a live demo
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Join 2,400+ restaurants already running on RestaurantOS
          </p>
        </div>
      </section>
    </main>
  );
}
