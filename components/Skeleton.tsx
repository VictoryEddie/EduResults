export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 flex gap-4">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-4 w-1/4 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-gray-100 flex gap-4 items-center">
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
        <div className="col-span-1 md:col-span-2 h-48 bg-gray-100 rounded-[32px]" />
        <div className="h-48 bg-gray-200 rounded-[32px]" />
      </div>
      {/* Table block */}
      <div className="h-96 bg-gray-100 rounded-[32px]" />
      {/* Remark block */}
      <div className="h-32 bg-gray-200 rounded-[32px]" />
    </div>
  );
}
