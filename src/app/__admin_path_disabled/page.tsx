import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Internal target for `beforeFiles` rewrites from `/admin` (see next.config.js).
 * Renders the global not-found UI while the browser URL can remain `/admin`.
 */
export default function LegacyAdminPathDisabledPage() {
  notFound();
}
