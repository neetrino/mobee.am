export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-24" aria-busy="true" aria-label="Loading admin">
      <div className="w-10 h-10 border-2 border-gray-300 border-t-admin rounded-full animate-spin" />
    </div>
  );
}
