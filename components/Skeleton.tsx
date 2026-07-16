export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="border border-slate-200 rounded-[24px] p-5 space-y-3 bg-white/70 backdrop-blur-md shadow-xl shadow-slate-200/40">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-slate-200 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-md shadow-2xl shadow-slate-200/40">
      <div className="bg-slate-50/50 px-4 py-3 flex gap-4">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-4 w-1/4 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-slate-100 flex gap-4 items-center">
          <SkeletonLine className="h-4 w-1/3" />
          <SkeletonLine className="h-4 w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
export function SkeletonResults() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 h-48 bg-slate-100 rounded-[32px]" />
        <div className="h-48 bg-slate-200 rounded-[32px]" />
      </div>
      {/* Table block */}
      <div className="h-96 bg-slate-100 rounded-[32px]" />
      {/* Remark block */}
      <div className="h-32 bg-slate-200 rounded-[32px]" />
    </div>
  );
}
