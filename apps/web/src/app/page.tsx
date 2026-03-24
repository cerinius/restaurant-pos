import Link from 'next/link';
import { Manrope, Space_Grotesk } from 'next/font/google';

import { LandingWarmupStatus } from '@/components/landing/LandingWarmupStatus';
import { getRestaurantPublicPath } from '@/lib/paths';

const bodyFont = Manrope({ subsets: ['latin'] });
const displayFont = Space_Grotesk({ subsets: ['latin'] });

const PLATFORM_PILLARS = [
  {
    title: 'Service floor control',
    body: 'Multi-room layouts, bar geometry, reusable table templates, live sections, and assignment-aware access turn the floor into a real service map instead of a flat grid.',
  },
  {
    title: 'Kitchen and bar execution',
    body: 'KDS stations, rush flow, fire timing, modifiers, and role-specific surfaces keep service and production synced from first ticket to payment.',
  },
  {
    title: 'Operator visibility',
    body: 'Menu setup, pricing rules, workflow controls, reporting, staff management, inventory, and audit history all live in the same tenant-aware platform.',
  },
  {
    title: 'Premium guest experience',
    body: 'Pro locations can launch a branded public homepage with menu, hours, ordering links, and reservations at the restaurant URL itself.',
  },
];

const ROLE_STORIES = [
  {
    title: 'Owner',
    body: 'Start from the landing page, spin up a trial, and immediately land in a tenant-scoped command center with pricing, floor, staff, reports, and public-site controls.',
  },
  {
    title: 'Manager',
    body: 'Assign sections, manage tables, approve sensitive actions, keep the shift moving, and maintain visibility without fighting the interface.',
  },
  {
    title: 'Server and Bartender',
    body: 'Fast table discovery, big touch targets, bar-aware layouts, check handling, and section restrictions keep the workflow quick and safe.',
  },
  {
    title: 'Host',
    body: 'Room awareness, table status, ownership, and seating cues support cleaner handoffs at the front door.',
  },
  {
    title: 'Kitchen and Expo',
    body: 'Station views, elapsed timing, rush handling, and bump flow are designed for constant motion and quick reads from a distance.',
  },
];

const DEMO_FLOW = [
  'Open the landing page and frame RestaurantOS as one connected platform for floor, kitchen, admin, and guest experience.',
  'Create a 7-day owner trial and show how quickly a restaurant gets a live tenant environment.',
  'Walk role-by-role through owner, manager, server, bartender, host, kitchen manager, and kitchen staff surfaces.',
  'Log into the seeded demo restaurant and prove that the stack is already usable today.',
  'Return to the newly created trial and show how the same system can be configured from scratch: rooms, bar, menu, KDS, seats, and website.',
];

const DIFFERENTIATORS = [
  'Full-service restaurant flow is the product center of gravity, not an afterthought layered onto a general POS.',
  'Tenant-scoped routing makes the SaaS operationally clean at scale: login, POS, KDS, admin, and public website all belong to the restaurant.',
  'The system is web-native and easier to iterate on than locked, hardware-first stacks that depend on reseller motion.',
  'The same platform can power staff operations and the guest-facing website, which creates a stronger Pro-tier upsell story.',
];

const PLANS = [
  {
    name: 'Basic',
    price: '$149',
    cadence: 'per location / month',
    badge: 'Launch cleanly',
    features: [
      'POS, KDS, menu, modifiers, discounts, and payments',
      'Floor mapping, room layouts, bar seating, and table assignments',
      'Up to 10 front-of-house users and 2 managers',
      'Email support and guided launch checklist',
    ],
  },
  {
    name: 'Advanced',
    price: '$279',
    cadence: 'per location / month',
    badge: 'Most popular',
    features: [
      'Everything in Basic',
      'Up to 25 front-of-house users and 5 managers',
      'Inventory, workflows, audit visibility, and deeper reporting',
      'Priority onboarding and customer success check-ins',
    ],
  },
  {
    name: 'Pro',
    price: '$499',
    cadence: 'per location / month',
    badge: 'Sell the full stack',
    features: [
      'Everything in Advanced',
      'Up to 75 front-of-house users and 12 managers',
      'Branded restaurant homepage at /:restaurantId with menu, hours, and ordering links',
      'White-glove rollout, premium support, and migration planning',
    ],
  },
];

const COMPARISON_ROWS = [
  {
    label: 'Pricing motion',
    restaurantOs: 'Transparent SaaS tiers',
    toast: 'Sales-led quote motion at scale',
    square: 'Entry pricing plus add-on ladder',
    clover: 'Varies by reseller bundle',
  },
  {
    label: 'Floor and bar depth',
    restaurantOs: 'Core product focus',
    toast: 'Broader platform emphasis',
    square: 'Simpler starting point',
    clover: 'Often hardware-first',
  },
  {
    label: 'Demo experience',
    restaurantOs: '7-day live owner environment',
    toast: 'Sales-guided demo path',
    square: 'Product-led plus sales assist',
    clover: 'Partner-led motion',
  },
  {
    label: 'Guest website included',
    restaurantOs: 'Built into Pro tier story',
    toast: 'Depends on add-on mix',
    square: 'Depends on broader ecosystem',
    clover: 'Depends on reseller stack',
  },
];

export default function HomePage() {
  const demoRestaurantId = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID || '';
  const demoRestaurantPath = demoRestaurantId ? getRestaurantPublicPath(demoRestaurantId) : null;

  return (
    <main
      className={`${bodyFont.className} min-h-screen text-slate-50`}
      style={{
        background:
          'radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 28%), radial-gradient(circle at top right, rgba(245,158,11,0.16), transparent 24%), linear-gradient(180deg, #07111f 0%, #0c1728 48%, #020617 100%)',
      }}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

        <header className="relative z-20">
          <div className="border-b border-cyan-300/15 bg-cyan-300/10">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-3 text-sm text-cyan-50 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-cyan-200/30 bg-cyan-100/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100">
                  Live Sales
                </span>
                <p className="leading-6 text-cyan-50/90">
                  Don't miss out on the number one POS built for service, kitchen, and guest experience.
                </p>
              </div>
              <Link href="/contact-sales" className="text-sm font-semibold text-cyan-100 transition hover:text-white">
                Book a walkthrough
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 py-5">
            <div className="glass-panel flex items-center justify-between gap-4 px-5 py-4">
              <Link href="/" className={`${displayFont.className} text-lg font-black tracking-[0.28em] text-white`}>
                RESTAURANTOS
              </Link>

              <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
                <a href="#platform" className="hover:text-white">Platform</a>
                <a href="#demo-flow" className="hover:text-white">Demo</a>
                <a href="#pricing" className="hover:text-white">Pricing</a>
                <a href="#compare" className="hover:text-white">Compare</a>
                <Link href="/staff" className="hover:text-white">Staff access</Link>
                <Link href="/contact-sales" className="hover:text-white">Contact sales</Link>
              </nav>

              <div className="hidden items-center gap-3 lg:flex">
                <Link href="/staff" className="btn-secondary">
                  Staff access
                </Link>
                <Link href="/login" className="btn-secondary">
                  Login
                </Link>
                <Link href="/demo" className="btn-primary">
                  Start live demo
                </Link>
              </div>

              <details className="relative lg:hidden">
                <summary className="list-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10">
                  Menu
                </summary>
                <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 p-3 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                  <div className="space-y-1">
                    {[
                      { href: '#platform', label: 'Platform' },
                      { href: '#demo-flow', label: 'Demo flow' },
                      { href: '#pricing', label: 'Pricing' },
                      { href: '#compare', label: 'Compare' },
                    ].map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                      >
                        {item.label}
                      </a>
                    ))}
                    <Link
                      href="/staff"
                      className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                    >
                      Staff access
                    </Link>
                    <Link
                      href="/contact-sales"
                      className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                    >
                      Contact sales
                    </Link>
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                    <Link href="/login" className="btn-secondary block text-center">
                      Login
                    </Link>
                    <Link href="/demo" className="btn-primary block text-center">
                      Start live demo
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 pb-24 pt-10 lg:pt-14">
          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <LandingWarmupStatus />
              <p className="section-kicker mt-6">Built for serious restaurant operations</p>
              <h1 className={`${displayFont.className} mt-4 max-w-4xl text-5xl font-black leading-[0.94] text-white sm:text-6xl lg:text-7xl`}>
                The restaurant operating system that sells itself in the first five minutes.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                RestaurantOS combines POS, KDS, floor control, section assignments, pricing rules, reporting, staffing, and a premium guest-facing website in one tenant-aware SaaS platform. It is built for restaurants that move fast and still need the product to feel calm, clear, and premium.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/demo" className="btn-primary px-6 py-4 text-base">
                  Launch a 7-day live demo
                </Link>
                <Link href="/contact-sales" className="btn-secondary px-6 py-4 text-base">
                  Talk to sales
                </Link>
                {demoRestaurantPath && (
                  <Link href={demoRestaurantPath} className="btn-secondary px-6 py-4 text-base">
                    Explore demo restaurant site
                  </Link>
                )}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { value: '7 days', label: 'full-access owner trial' },
                  { value: '1 stack', label: 'service, kitchen, admin, and website' },
                  { value: '1000+', label: 'restaurants supported by tenant routing' },
                ].map((item) => (
                  <div key={item.label} className="metric-tile">
                    <p className={`${displayFont.className} text-3xl font-black text-white`}>{item.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel overflow-hidden p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">What the client sees</p>
                  <h2 className={`${displayFont.className} mt-2 text-3xl font-black text-white`}>
                    One platform, multiple wow moments
                  </h2>
                </div>
                <span className="status-chip">Live demo ready</span>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="soft-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Landing page</p>
                  <p className="mt-3 text-xl font-black text-white">Explain the product clearly before anyone logs in</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Product story, pricing, differentiation, premium website value, and a warm API so the live experience feels intentional.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="soft-panel p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
                    <p className="mt-3 text-lg font-black text-white">POS, floor, KDS, roles</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">Service surfaces built for rush-hour speed and fast onboarding.</p>
                  </div>
                  <div className="soft-panel p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Growth</p>
                    <p className="mt-3 text-lg font-black text-white">SaaS tiers and guest website</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">Clear upgrade story from operational core to premium web presence.</p>
                  </div>
                </div>
                <div className="soft-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Demo close</p>
                  <p className="mt-3 text-xl font-black text-white">Create a new trial, then show how fast a restaurant becomes real</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Spin up a new tenant, log into the owner account, configure rooms, menu, KDS, and public homepage, then let the buyer picture their own rollout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="section-kicker">The whole platform</p>
            <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
              Built for the floor, the line, the owner, and the guest.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Restaurants do not need another isolated tool. They need one product that respects service flow, kitchen pressure, permissions, reporting, and the guest experience outside the dining room.
            </p>
          </div>

          <div className="mt-12 grid gap-6 xl:grid-cols-4">
            {PLATFORM_PILLARS.map((item) => (
              <article key={item.title} className="glass-panel p-6">
                <h3 className={`${displayFont.className} text-2xl font-black text-white`}>{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {DIFFERENTIATORS.map((item) => (
              <div key={item} className="soft-panel p-5 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="card p-8">
              <p className="section-kicker">Role by role</p>
              <h2 className={`${displayFont.className} mt-3 text-4xl font-black text-white`}>
                Every user should know where they belong instantly.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                The tenant structure makes navigation clean, but the UX has to do the rest. These are the perspectives the product is designed to support in the pitch and in live shifts.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ROLE_STORIES.map((item) => (
                <div key={item.title} className="soft-panel p-5">
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo-flow" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="section-kicker">Client demo script</p>
              <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
                A demo flow that builds confidence instead of confusion.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The strongest pitch is a narrative: why we built it, how quickly an owner can start, how every staff role uses it, then how the same platform also becomes the restaurant's branded web presence.
              </p>
            </div>

            <div className="space-y-4">
              {DEMO_FLOW.map((step, index) => (
                <div key={step} className="glass-panel flex gap-4 p-5">
                  <div className={`${displayFont.className} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-lg font-black text-slate-950`}>
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="glass-panel p-8">
              <p className="section-kicker">Pro tier unlock</p>
              <h2 className={`${displayFont.className} mt-3 text-4xl font-black text-white`}>
                Every restaurant can have a homepage at its own URL.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                `/:restaurantId` can now act as a branded public restaurant page with menu, hours, ordering links, reservation links, and the restaurant story. Owners manage it from the same settings surface they use for POS and operational preferences.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  'One source of truth for menu and guest content',
                  'Premium upsell that feels concrete in the demo',
                  'Shareable branded page without another vendor',
                ].map((item) => (
                  <div key={item} className="soft-panel p-4 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-8">
              <p className="section-kicker">Why that matters</p>
              <h3 className={`${displayFont.className} mt-3 text-3xl font-black text-white`}>
                It turns the platform from an internal tool into a revenue and branding stack.
              </h3>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                When the same system runs operations and also powers the public-facing restaurant site, the product story gets stronger: fewer tools, cleaner data, better consistency, and a much easier reason to justify Pro pricing.
              </p>
              {demoRestaurantPath && (
                <div className="mt-6">
                  <Link href={demoRestaurantPath} className="btn-secondary">
                    See the demo restaurant homepage
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker">SaaS pricing</p>
              <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
                Price it like a serious restaurant platform.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Charge by location, expand value through user limits, service depth, and premium guest-facing features. That creates a cleaner sales motion and a clear path to upgrade.
              </p>
            </div>
            <div className="status-chip">Annual suggestion: two months free</div>
          </div>

          <div className="mt-12 grid gap-6 xl:grid-cols-3">
            {PLANS.map((plan, index) => (
              <div
                key={plan.name}
                className={`rounded-[36px] border p-8 ${
                  index === 1
                    ? 'border-cyan-300/30 bg-cyan-400/10 shadow-[0_30px_80px_rgba(34,211,238,0.16)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`${displayFont.className} text-3xl font-black text-white`}>{plan.name}</h3>
                  <span className="status-chip">{plan.badge}</span>
                </div>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="pb-2 text-sm text-slate-400">{plan.cadence}</span>
                </div>
                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="soft-panel px-4 py-3 text-sm text-slate-200">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="compare" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="section-kicker">Positioning</p>
            <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
              Where RestaurantOS is stronger in the pitch.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              The point is not to say the market leaders are weak. It is to show that RestaurantOS is more tightly optimized for full-service restaurant flow, clearer SaaS packaging, and faster adaptation.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur">
            <div className="grid grid-cols-5 border-b border-white/10 bg-black/20 px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              <div>Dimension</div>
              <div>RestaurantOS</div>
              <div>Toast</div>
              <div>Square</div>
              <div>Clover</div>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div key={row.label} className="grid grid-cols-5 border-b border-white/5 px-6 py-5 text-sm text-slate-200 last:border-b-0">
                <div className="font-semibold text-white">{row.label}</div>
                <div className="text-cyan-100">{row.restaurantOs}</div>
                <div>{row.toast}</div>
                <div>{row.square}</div>
                <div>{row.clover}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Positioning language above is based on public product and pricing pages reviewed on March 23, 2026.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="overflow-hidden rounded-[40px] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(7,17,31,0.96),rgba(245,158,11,0.16))] p-10 shadow-[0_40px_120px_rgba(2,6,23,0.5)]">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
              <div>
                <p className="section-kicker">Next step</p>
                <h2 className={`${displayFont.className} mt-4 text-4xl font-black text-white sm:text-5xl`}>
                  Let the product pitch itself in a live restaurant environment.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
                  Start a live demo, create a trial, show the role-based workflows, then finish on the branded restaurant homepage. That is the story that gets buyers excited.
                </p>
              </div>
              <div className="space-y-4">
                <Link href="/demo" className="btn-primary block px-6 py-4 text-center text-base">
                  Start the 7-day live demo
                </Link>
                <Link href="/contact-sales" className="btn-secondary block px-6 py-4 text-center text-base">
                  Contact sales
                </Link>
                <Link href="/staff" className="btn-secondary block px-6 py-4 text-center text-base">
                  Staff access
                </Link>
                <Link href="/login" className="btn-secondary block px-6 py-4 text-center text-base">
                  Customer login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}