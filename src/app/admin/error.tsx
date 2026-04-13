'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // e.g. Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin error</h2>
        <p className="text-gray-600 mb-4">Something went wrong. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Try again
          </button>
          <Link href="/admin" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
