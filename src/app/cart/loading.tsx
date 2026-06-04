import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';

export default function CartLoading() {
  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
      <div className="animate-pulse">
        <div className="mb-8 h-8 w-1/4 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="h-64 rounded bg-gray-200 lg:col-span-2" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
