import Link from 'next/link';
import {
  ChartBarSquareIcon,
  CommandLineIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { LandingWarmupStatus } from '@/components/landing/LandingWarmupStatus';

const features = [
  {
    title: 'Service, kitchen, and reservations stay in sync',
    body: 'One operational model powers floor state, ticket flow, waitlist timing, and guest history without stitching tools together.',
    Icon: CommandLineIcon,
  },
  {
    title: 'Made for live shifts, not static dashboards',
    body: 'Servers, hosts, kitchen staff, and managers all work from interfaces tuned for speed, clarity, and touch-first use.',
    Icon: DevicePhoneMobileIcon,
  },
  {
    title: 'Intelligence layered into the daily workflow',
    body: 'Forecast demand, surface risk, and respond faster with operational signals that show up where work is happening.',
    Icon: CpuChipIcon,
  },
];

const proofStats = [
  { value: '3.2x', label: 'faster table turns reported by multi-unit pilots' },
  { value: '28%', label: 'average labor improvement after schedule optimization' },
  { value: '$4.8k', label: 'monthly software savings replacing separate tools' },
  { value: '99.97%', label: 'uptime target for enterprise rollouts' },
];

const productBands = [
  {
    eyebrow: 'POS + Floor',
    title: 'A service workspace built for pressure',
    body: 'Move between floor map, menu entry, open checks, modifiers, and payments without losing the active ticket.',
  },
  {
    eyebrow: 'KDS',
    title: 'Kitchen screens that prioritize urgency clearly',
    body: 'Rush, allergy, elapsed-time, and station state are visible immediately, with resilient real-time updates.',
  },
  {
    eyebrow: 'Host',
    title: 'Reservations, waitlist, and seating in one flow',
    body: 'Hosts get table suggestions, guest context, pacing support, and a live connection to the floor state.',
  },
  {
    eyebrow: 'Admin',
    title: 'Operational control without spreadsheet fatigue',
    body: 'Menu, staff, reports, schedules, discounts, taxes, and integrations all follow one drawer-led admin system.',
  },
  {
    eyebrow: 'Guests',
    title: 'Public ordering that feels branded and frictionless',
    body: 'Pickup, delivery, checkout, and restaurant pages keep guest confidence high while staying easy to manage.',
  },
  {
    eyebrow: 'People + Growth',
    title: 'Workforce and CRM are part of the same platform',
    body: 'Scheduling, guest profiles, campaigns, loyalty, and staffing all inherit the same data model.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '$149',
    description: 'Single-location foundation for restaurants that want one clean operating stack.',
    features: ['POS and KDS', 'Floor plan and table service', 'Menu management', 'Core reports', 'Up to 10 staff'],
  },
  {
    name: 'Growth',
    price: '$279',
    description: 'Best for operators adding reservations, workforce planning, and guest growth loops.',
    features: ['Everything in Starter', 'Reservations and waitlist', 'Guest profiles and loyalty', 'Scheduling and labor tools', 'Priority support'],
    featured: true,
  },
  {
    name: 'Empire',
    price: '$499',
    description: 'Multi-location oversight with stronger controls, support, and enterprise-ready operations.',
    features: ['Everything in Growth', 'Multi-location oversight', 'Cross-location analytics', 'Advanced permissions', 'Implementation support'],
  },
];

const testimonials = [
  {
    quote: 'We replaced multiple subscriptions with one system and our managers finally had a shared source of truth.',
    author: 'Marcus T.',
    role: 'Owner, Ember & Oak',
  },
  {
    quote: 'The host and server handoff is dramatically cleaner because reservations, table state, and checks live together.',
    author: 'Priya S.',
    role: 'General Manager, Saffron Room',
  },
  {
    quote: 'The product feels like it was designed for real dinner rushes, not for demos.',
    author: 'Carlos R.',
    role: 'Operations Director, Casa Meridian',
  },
];

const faqs = [
  {
    q: 'Is RestaurantOS web-native or hardware locked?',
    a: 'The product is web-native, so teams can run quickly without being boxed into a hardware-first rollout.',
  },
  {
    q: 'Can multi-location groups standardize workflows?',
    a: 'Yes. Menu, staff, pricing rules, reports, and workflow configuration can be managed with location-aware controls.',
  },
  {
    q: 'Do guest-facing tools come from the same system?',
    a: 'Yes. Public ordering, restaurant pages, reservations, loyalty, and campaigns all use the same underlying guest and order data.',
  },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(214,166,74,0.16),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_42%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-slate-300/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(238,232,221,0.86))] p-4 shadow-[0_36px_120px_rgba(8,15,30,0.22)]">
        <div className="rounded-[26px] border border-slate-300/55 bg-slate-950 p-4 text-slate-50">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">Service Workspace</p>
              <h3 className="mt-1 text-lg font-bold">Floor, menu, and payment in one view</h3>
            </div>
            <div className="flex gap-2">
              <span className="status-chip status-chip-available">Live</span>
              <span className="status-chip status-chip-info">Main Dining</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Floor Map</p>
                <span className="text-xs text-slate-500">24 tables</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['12', '14', '21', '22', '31', 'Bar 4'].map((table, index) => (
                  <div
                    key={table}
                    className={`rounded-[18px] border px-3 py-4 text-center text-sm font-bold ${
                      index === 1
                        ? 'table-occupied'
                        : index === 4
                          ? 'table-dirty'
                          : 'table-available'
                    }`}
                  >
                    <div>{table}</div>
                    <div className="mt-1 text-[11px] font-semibold opacity-80">
                      {index === 1 ? '$128' : index === 4 ? 'Reset' : 'Open'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Active Check</p>
                <span className="status-chip status-chip-pending">3 ready to fire</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Seared Salmon', '$32'],
                  ['Roasted Carrots', '$12'],
                  ['Sparkling Water', '$8'],
                ].map(([label, price]) => (
                  <div key={label} className="rounded-[18px] border border-white/10 bg-slate-900/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{label}</p>
                        <p className="text-xs text-slate-500">Course 1</p>
                      </div>
                      <p className="text-sm font-bold text-slate-100">{price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-400/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-100">Total due</span>
                  <span className="text-xl font-bold text-amber-50">$58.66</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(214,166,74,0.12),transparent_22%),linear-gradient(180deg,#f7f4ee_0%,#f3eee4_48%,#ece5d8_100%)] text-slate-900">
      <LandingWarmupStatus />

      <header className="sticky top-4 z-30 mx-auto mt-4 w-[min(1180px,calc(100%-1.5rem))] rounded-[28px] border border-slate-300/60 bg-white/70 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">RestaurantOS</p>
            <p className="text-sm text-slate-500">One operating system for modern restaurants</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <a href="#product" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Product</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">Pricing</a>
            <a href="#faq" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">FAQ</a>
            <Link href="/contact-sales" className="btn-secondary min-h-[42px] border-slate-300 bg-white/60 text-slate-900 hover:bg-white">
              Contact Sales
            </Link>
            <Link href="/demo" className="btn-primary min-h-[42px]">
              Get a Demo
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">
            <ShieldCheckIcon className="h-4 w-4" />
            Premium, web-native restaurant operations
          </div>
          <h1 className="font-display mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl">
            Replace scattered restaurant software with one cohesive system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            RestaurantOS unifies POS, KDS, reservations, guest experience, workforce tools, and admin operations into one responsive platform built for real service pressure.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/demo" className="btn-primary px-7 text-base">
              Get a Demo
            </Link>
            <Link href="/contact-sales" className="btn-secondary border-slate-300 bg-white/70 px-7 text-base text-slate-900 hover:bg-white">
              Start Free Trial
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {features.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-[24px] border border-slate-300/60 bg-white/65 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                <Icon className="h-6 w-6 text-amber-700" />
                <h2 className="mt-4 text-base font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-4 rounded-[32px] border border-slate-300/60 bg-white/65 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] md:grid-cols-4">
          {proofStats.map((stat) => (
            <div key={stat.value} className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,238,0.9))] p-5">
              <p className="font-display text-4xl font-semibold text-slate-950">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="section-kicker">Product System</p>
          <h2 className="font-display mt-4 text-4xl font-semibold text-slate-950 sm:text-5xl">
            Every core workflow follows one design language and one data model.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productBands.map((band) => (
            <div key={band.title} className="rounded-[28px] border border-slate-300/60 bg-white/70 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">{band.eyebrow}</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">{band.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{band.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 rounded-[36px] bg-[linear-gradient(135deg,#0e1726_0%,#132033_45%,#1b2b42_100%)] p-8 text-white shadow-[0_30px_110px_rgba(8,15,30,0.32)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="section-kicker">Operational Intelligence</p>
            <h2 className="font-display mt-4 text-4xl font-semibold text-white sm:text-5xl">
              Live reporting should help teams act, not just review.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-300">
              RestaurantOS brings revenue, labor, guest, and service signals into one command layer so managers can make decisions in real time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Demand pacing', 'Forecast covers and staffing pressure before the room gets overwhelmed.'],
              ['Kitchen load', 'See station backlog and average ticket pace while service is live.'],
              ['Guest context', 'VIP, allergy, and return-visit signals stay close to operational actions.'],
              ['Risk detection', 'Spot lagging sales, slow table turns, and service bottlenecks earlier.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
                <ChartBarSquareIcon className="h-6 w-6 text-amber-300" />
                <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="section-kicker">Pricing</p>
          <h2 className="font-display mt-4 text-4xl font-semibold text-slate-950">Simple plans, one coherent platform.</h2>
          <p className="mt-4 text-lg text-slate-600">
            Keep pricing transparent, reduce tool overlap, and choose the plan that matches your operating complexity.
          </p>
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[32px] border p-7 shadow-[0_20px_60px_rgba(15,23,42,0.07)] ${
                plan.featured
                  ? 'border-amber-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,236,215,0.94))]'
                  : 'border-slate-300/60 bg-white/70'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-bold text-slate-950">{plan.name}</h3>
                {plan.featured && <span className="status-chip border-amber-300/30 bg-amber-400/15 text-amber-900">Most Popular</span>}
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold text-slate-950">{plan.price}</span>
                <span className="pb-2 text-sm text-slate-500">/ location / month</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                    <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/demo" className="btn-primary mt-8 w-full justify-center">
                Start with {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.author} className="rounded-[28px] border border-slate-300/60 bg-white/70 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <p className="text-lg leading-8 text-slate-800">“{testimonial.quote}”</p>
              <p className="mt-6 text-sm font-bold text-slate-950">{testimonial.author}</p>
              <p className="text-sm text-slate-500">{testimonial.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="section-kicker">FAQ</p>
            <h2 className="font-display mt-4 text-4xl font-semibold text-slate-950">Clear answers for operators evaluating change.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-[24px] border border-slate-300/60 bg-white/70 p-6">
                <h3 className="text-lg font-bold text-slate-950">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-12">
        <div className="mx-auto max-w-7xl rounded-[40px] bg-[linear-gradient(135deg,#0e1726_0%,#132033_60%,#1b2b42_100%)] px-8 py-12 text-white shadow-[0_34px_120px_rgba(8,15,30,0.34)] sm:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="section-kicker">Next Step</p>
              <h2 className="font-display mt-4 text-4xl font-semibold text-white sm:text-5xl">
                See RestaurantOS in a real operating flow.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Book a guided demo or start a free trial to review the exact surfaces your team will use across service, kitchen, host, admin, and staff workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/demo" className="btn-primary px-7 text-base">
                Get a Demo
              </Link>
              <Link href="/contact-sales" className="btn-secondary px-7 text-base">
                Talk to Sales
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">No credit card required</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Responsive web rollout</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">Built for operators, staff, and guests</span>
          </div>
        </div>
      </section>
    </main>
  );
}
