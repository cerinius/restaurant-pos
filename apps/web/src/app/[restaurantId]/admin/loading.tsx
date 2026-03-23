import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

export default function RestaurantAdminLoading() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-950">
      <div className="hidden w-72 shrink-0 border-r border-slate-700 bg-slate-900 xl:block">
        <div className="border-b border-slate-700 px-4 py-5">
          <SkeletonBlock className="h-8 w-36" />
        </div>
        <div className="space-y-3 px-3 py-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-11 w-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-4 xl:hidden">
          <SkeletonBlock className="h-10 w-40" />
        </div>
        <div className="space-y-4 p-6">
          <LoadingNotice
            title="Loading restaurant admin"
            description="We are preparing your dashboard, floor plan, and admin tools."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28 w-full" />
            ))}
          </div>
          <SkeletonBlock className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
