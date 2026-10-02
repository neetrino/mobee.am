'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/navigation';

interface AparikTermsBlockProps {
  summary: string;
  details: string;
  hereLabel: string;
  seeMoreLabel: string;
  seeLessLabel: string;
}

export function AparikTermsBlock({
  summary,
  details,
  hereLabel,
  seeMoreLabel,
  seeLessLabel,
}: AparikTermsBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-700">
      <p>
        {summary}{' '}
        <Link href="/credit" className="font-medium text-admin-600 underline hover:text-admin-700">
          {hereLabel}
        </Link>
      </p>
      {expanded ? <p>{details}</p> : null}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-sm font-medium text-admin-600 underline hover:text-admin-700"
      >
        {expanded ? seeLessLabel : seeMoreLabel}
      </button>
    </div>
  );
}
