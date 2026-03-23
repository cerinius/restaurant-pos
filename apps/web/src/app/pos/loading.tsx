export default function POSLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="h-16 animate-pulse border-b border-slate-800 bg-slate-900/70" />
      <div className="flex flex-1 flex-col gap-4 p-4 xl:flex-row">
        <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-800" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-800" />
            ))}
          </div>
        </div>
        <div className="h-72 rounded-3xl border border-slate-800 bg-slate-900/50 xl:h-auto xl:w-80" />
      </div>
    </div>
  );
}
