import { LoadingNotice, SkeletonBlock } from '@/components/ui/LoadingState';

export default function StaffAccessLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-8">
      <div className="w-full max-w-lg space-y-4 rounded-[32px] border border-white/10 bg-slate-950/80 p-8">
        <LoadingNotice
          title="Opening staff access"
          description="Checking this device for a saved restaurant and waking the API if needed."
        />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}
