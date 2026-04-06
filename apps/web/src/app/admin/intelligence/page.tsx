import { notFound } from 'next/navigation';
import { SparklesIcon } from '@heroicons/react/24/outline';

import { IS_INTERNAL_ENVIRONMENT, OPERATIONS_INTELLIGENCE_ENABLED } from '@/lib/features';

export default function IntelligencePage() {
  if (!OPERATIONS_INTELLIGENCE_ENABLED) {
    if (!IS_INTERNAL_ENVIRONMENT) {
      notFound();
    }

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card max-w-xl p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-white">Operations Intelligence is disabled</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This module stays hidden in production until it is backed by real data and real workflows.
            Enable `NEXT_PUBLIC_ENABLE_OPERATIONS_INTELLIGENCE=true` only for internal development.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card max-w-xl p-6 text-center">
        <h1 className="text-2xl font-black text-white">Operations Intelligence</h1>
        <p className="mt-2 text-sm text-slate-400">
          This route is reserved for real intelligence features backed by production data.
        </p>
      </div>
    </div>
  );
}
