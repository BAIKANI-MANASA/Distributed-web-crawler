export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-3 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2">
        <div className="h-4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
