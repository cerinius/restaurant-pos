import Link from 'next/link';

import { DemoSignupForm } from '@/components/landing/DemoSignupForm';
import { LandingWarmupStatus } from '@/components/landing/LandingWarmupStatus';

const DEMO_BENEFITS = [
  'Owner-level access from the moment the demo is created',
  'Sample floor plan with dining room, patio, and bar',
  'Live menu, taxes, stations, discounts, and seeded data',
  'Automatic seven-day expiration for clean trial management',
];

const DEMO_STEPS = [
  'Create a restaurant and verify the contact details by OTP.',
  'Land inside a tenant-scoped owner workspace with real URLs.',
  'Switch between owner, manager, server, bartender, and kitchen views.',
  'Configure floor, menu, KDS, and public restaurant homepage.',
];

export default function DemoPage() {
  return (
    <main
      className="min-h-screen px-6 py-8 text-slate-50"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 30%), radial-gradient(circle at top right, rgba(245,158,11,0.14), transparent 24%), linear-gradient(180deg, #07111f 0%, #0c1728 52%, #020617 100%)',
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-[0.24em] text-white">
            RESTAURANTOS
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <LandingWarmupStatus />
            <Link href="/login" className="btn-secondary">
              Existing customer login
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="space-y-6">
            <div className="glass-panel p-7">
              <p className="section-kicker">7-day live environment</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white">
                Create a trial that feels like a real restaurant from day one.
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-300">
                This is more than a sandbox. We create a live owner environment with a real tenant, restaurant-scoped URLs, sample operational data, and the premium website story built in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {DEMO_BENEFITS.map((item) => (
                <div key={item} className="soft-panel p-5 text-sm leading-7 text-slate-300">
                  {item}
                </div>
              ))}
            </div>

            <div className="card p-6">
              <p className="section-kicker">What happens next</p>
              <div className="mt-4 space-y-3">
                {DEMO_STEPS.map((step, index) => (
                  <div key={step} className="soft-panel flex gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-slate-950">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <DemoSignupForm />
        </div>
      </div>
    </main>
  );
}
