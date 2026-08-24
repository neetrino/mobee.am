interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function AdminTableSkeleton({ rows = 8, columns = 6 }: AdminTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-supersudo border border-gray-200 bg-white" aria-busy="true" aria-label="Loading table">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex gap-3">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-3 flex-1 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-3 px-4 py-4">
            <div className="h-4 w-4 shrink-0 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-10 shrink-0 rounded-supersudo bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/5 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
