'use client';

import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';

export function CompareTableSkeleton() {
  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-6`}>
      <div className="mb-8 mt-3 h-9 w-48 animate-pulse rounded bg-gray-200" />
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="animate-pulse space-y-0">
          <div className="h-12 border-b border-gray-200 bg-gray-50" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-4 border-b border-gray-100 px-4 py-6 last:border-b-0">
              <div className="h-5 w-32 shrink-0 rounded bg-gray-200" />
              <div className="mx-auto h-32 w-32 rounded-lg bg-gray-200" />
              <div className="mx-auto h-32 w-32 rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
