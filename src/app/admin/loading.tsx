export default function AdminLoading() {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Loading admin">
      <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
        <div className="h-4 w-11/12 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 w-10/12 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="rounded-supersudo border border-gray-200 bg-white p-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-supersudo bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/5 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/4 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
