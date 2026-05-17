export type PaginationPageItem = number | 'ellipsis';

/** Sliding window length on shop catalog pagination below Tailwind `md` (phones). */
export const SHOP_PAGINATION_PHONE_VISIBLE_PAGE_COUNT = 3;

/**
 * Tablet / desktop shop pagination — first, last, current ±1 with ellipses when needed.
 */
export function getPaginationPages(
  totalPages: number,
  current: number,
): PaginationPageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const sorted = Array.from(set)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const out: PaginationPageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      out.push('ellipsis');
    }
    out.push(sorted[i]!);
  }
  return out;
}

/**
 * Phone shop pagination — {@link visibleCount} consecutive pages sliding with current
 * (e.g. page 1 → `1,2,3`, after Next → `2,3,4`).
 */
export function getPaginationPagesPhoneWindow(
  totalPages: number,
  current: number,
  visibleCount: number = SHOP_PAGINATION_PHONE_VISIBLE_PAGE_COUNT,
): number[] {
  if (totalPages <= visibleCount) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const clampedCurrent = Math.min(totalPages, Math.max(1, current));
  const maxStart = totalPages - visibleCount + 1;
  const start = Math.min(Math.max(1, clampedCurrent), maxStart);
  const end = start + visibleCount - 1;

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
