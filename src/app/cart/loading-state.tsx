'use client';

import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';

export function LoadingState() {
  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}




