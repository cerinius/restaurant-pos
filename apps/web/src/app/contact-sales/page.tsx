import Link from 'next/link';

import { ContactSalesForm } from '@/components/landing/ContactSalesForm';
import { LandingWarmupStatus } from '@/components/landing/LandingWarmupStatus';

export default function ContactSalesPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.15),transparent_35%),linear-gradient(180deg,#020617_0%,#111827_58%,#020617_100%)] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-[0.24em] text-white">
            RESTAURANTOS
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <LandingWarmupStatus />
            <Link href="/demo" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
              Try live demo
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Sales engineering</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white">
                Rollout strategy, not just software.
              </h1>
              <p className="mt-4 text-base text-slate-300">
                If you are replacing an existing POS, rolling out multiple locations, or planning a larger service redesign, this path is for you.
              </p>
            </div>

            <div className="space-y-4">
              {[
                'Transparent SaaS pricing mapped to location count and service complexity',
                'Assisted configuration for floor maps, staff permissions, and menu structure',
                'Phased launch planning for high-volume restaurants and restaurant groups',
                'Support for owner, manager, server, bartender, cashier, expo, and KDS workflows',
              ].map((item) => (
                <div key={item} className="rounded-[28px] border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <ContactSalesForm />
        </div>
      </div>
    </main>
  );
}
