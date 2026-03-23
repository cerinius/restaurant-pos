export default function KDSLoading() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mb-6 h-24 animate-pulse rounded-3xl bg-slate-900" />
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 w-28 animate-pulse rounded-2xl bg-slate-900" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
