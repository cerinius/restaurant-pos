'use client';
import nextDynamic from 'next/dynamic'; // Renamed to avoid collision

export const dynamic = 'force-dynamic';

const POSShell = nextDynamic(() => import('./POSShell'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
        <p className="text-slate-400 font-medium">Initializing POS System...</p>
      </div>
    </div>
  ),
});

export default function POSPage() {
  return <POSShell />;
}