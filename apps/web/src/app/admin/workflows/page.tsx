'use client';

export default function WorkflowsPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-bold text-slate-100">Workflow Builder</h1>
        <p className="text-sm text-slate-400">
          Role-based service workflows, prompts, and quick actions live here.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Coming next
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Train every role with a screen built for their shift.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            This screen is reserved for restaurant-specific workflow presets like server quick
            buttons, bartender prompts, expo actions, and role-specific layouts. The route is live
            now so it fits the new tenant admin structure cleanly.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            'Server workflows for upsells, coursing, and check controls',
            'Bartender workflows for bar tabs, seats, and modifier-heavy drinks',
            'Expo and manager workflows for quality control and approvals',
          ].map((item) => (
            <div
              key={item}
              className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
