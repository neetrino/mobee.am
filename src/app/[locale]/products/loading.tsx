export default function ProductsLoading() {
  return (
    <div className="flex items-center justify-center py-24" aria-busy="true" aria-label="Loading products">
      <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );
}
