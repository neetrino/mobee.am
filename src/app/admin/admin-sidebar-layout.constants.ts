/** Desktop admin sidebar: full width (Tailwind class). */
export const ADMIN_SIDEBAR_DESKTOP_WIDTH_FULL_CLASS = 'w-64';

/** Desktop admin sidebar: collapsed icon rail width (Tailwind class). */
export const ADMIN_SIDEBAR_DESKTOP_WIDTH_ICON_RAIL_CLASS = 'w-16';

/**
 * Figma mobee-new node 178:526 (Overlay+Shadow) — elevation on collapsed home mark.
 * Matches design dev mode shadow stack.
 */
export const ADMIN_SIDEBAR_COLLAPSED_MARK_SHADOW_CLASS =
  'shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]';

/**
 * Figma mobee-new node 178:526 — compact home mark: 40×40, radius 12px, brand fill + shadow.
 * Center content (e.g. letter 178:527) via flex.
 */
export const ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_CLASS = [
  'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-admin-500',
  ADMIN_SIDEBAR_COLLAPSED_MARK_SHADOW_CLASS,
].join(' ');

/** Figma mobee-new node 178:527 — typography for mark letter (font family + weight from next/font). */
export const ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_LETTER_CLASS =
  'text-[20px] leading-[28px] text-white select-none';

/** Space below sidebar header chrome (`border-b`) before first nav item (e.g. dashboard). */
export const ADMIN_SIDEBAR_NAV_SCROLL_TOP_PADDING_CLASS = 'pt-3';

/** When desktop sidebar is icon rail: cap main width and center in the remaining row space. */
export const ADMIN_PAGE_MAIN_CENTER_WHEN_SIDEBAR_COLLAPSED_CLASS = 'lg:mx-auto lg:max-w-7xl';
