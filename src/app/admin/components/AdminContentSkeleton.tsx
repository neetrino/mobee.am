const LINE_WIDTH_CLASSES = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12'];

interface AdminContentSkeletonProps {
  lines?: number;
}

export function AdminContentSkeleton({ lines = 4 }: AdminContentSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading content">
      <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-4 rounded bg-gray-200 animate-pulse ${LINE_WIDTH_CLASSES[index % LINE_WIDTH_CLASSES.length]}`}
          />
        ))}
      </div>
    </div>
  );
}
