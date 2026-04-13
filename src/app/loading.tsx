export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-gray-50" aria-busy="true" aria-label="Loading">
      <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );
}
