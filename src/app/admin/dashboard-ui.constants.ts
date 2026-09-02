/** Grill-style admin dashboard / analytics visual tokens (mobee `admin` palette). */

export const ADMIN_DASH_CARD_CLASS =
  'rounded-[15px] bg-white ring-1 ring-gray-100/80';

export const ADMIN_DASH_CARD_HOVER_CLASS =
  'transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export const ADMIN_DASH_CHIP_PRIMARY = {
  bg: 'bg-admin-100',
  fg: 'text-admin-700',
} as const;

export const ADMIN_DASH_CHIP_ACCENT = {
  bg: 'bg-amber-100',
  fg: 'text-amber-800',
} as const;

export const ADMIN_DASH_CHIP_NEUTRAL = {
  bg: 'bg-gray-100',
  fg: 'text-gray-700',
} as const;

export const ADMIN_DASH_TONE = {
  primary: 'bg-admin-50 ring-admin-200/80',
  accent: 'bg-amber-50 ring-amber-200/80',
  ink: 'bg-gray-50 ring-gray-200',
  surface: 'bg-gray-50/80 ring-gray-100',
} as const;
