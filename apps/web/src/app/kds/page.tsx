import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const KDSShell = nextDynamic(() => import('./KDSShell'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950">
      <p className="text-slate-400">Loading Kitchen Display...</p>
    </div>
  ),
});

export default function KDSPage() {
  return <KDSShell />;
}