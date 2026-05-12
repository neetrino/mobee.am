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

/** Collapsed home “M” and desktop toggle: shared 40×40 squircle footprint (Figma 178:526). */
export const ADMIN_SIDEBAR_COLLAPSED_MARK_OUTER_GEOMETRY_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl';

/**
 * Figma mobee-new node 178:526 — compact home mark: 40×40, radius 12px, brand fill + shadow.
 * Center content (e.g. letter 178:527) via flex.
 */
export const ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_CLASS = [
  ADMIN_SIDEBAR_COLLAPSED_MARK_OUTER_GEOMETRY_CLASS,
  'bg-admin-500',
  ADMIN_SIDEBAR_COLLAPSED_MARK_SHADOW_CLASS,
].join(' ');

/**
 * Desktop sidebar expand/collapse: same squircle + elevation as collapsed home mark; neutral surface.
 */
export const ADMIN_SIDEBAR_DESKTOP_TOGGLE_SQUIRCLE_CLASS = [
  ADMIN_SIDEBAR_COLLAPSED_MARK_OUTER_GEOMETRY_CLASS,
  'border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900',
  'focus-visible:outline focus-visible:ring-2 focus-visible:ring-admin-400 focus-visible:ring-offset-2',
  ADMIN_SIDEBAR_COLLAPSED_MARK_SHADOW_CLASS,
].join(' ');

/**
 * Expanded desktop sidebar header: compact collapse control (smaller than icon-rail expand).
 */
export const ADMIN_SIDEBAR_DESKTOP_TOGGLE_COMPACT_CLASS = [
  'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors',
  'hover:border-gray-300 hover:text-gray-900',
  'focus-visible:outline focus-visible:ring-2 focus-visible:ring-admin-400 focus-visible:ring-offset-2',
].join(' ');

/** Figma mobee-new node 178:527 — typography for mark letter (font family + weight from next/font). */
export const ADMIN_SIDEBAR_COLLAPSED_HOME_MARK_LETTER_CLASS =
  'text-[20px] leading-[28px] text-white select-none';

/** Space below sidebar header chrome (`border-b`) before first nav item (e.g. dashboard). */
export const ADMIN_SIDEBAR_NAV_SCROLL_TOP_PADDING_CLASS = 'pt-3';

/**
 * Icon rail: horizontal padding on the nav scroll stack so active `bg-admin` rows sit slightly
 * inset from the rail side edges.
 */
export const ADMIN_SIDEBAR_COLLAPSED_RAIL_NAV_SCROLL_PADDING_X_CLASS = 'px-1';

/** Bottom padding for `/supersudo` main column on every admin page (scroll / safe area). */
export const ADMIN_PAGE_MAIN_BOTTOM_PADDING_CLASS = 'pb-10';

/** Nudge main column slightly left when desktop sidebar is expanded (lg+). */
export const ADMIN_PAGE_MAIN_EXPANDED_SHIFT_LEFT_CLASS = 'lg:-translate-x-[15px]';

/** Nudge collapsed-rail main column content left (1.25rem = 20px at 16px root). */
export const ADMIN_PAGE_MAIN_COLLAPSED_SHIFT_LEFT_CLASS = 'lg:-translate-x-5';

/**
 * When desktop sidebar is icon rail: center content in the main flex column (not 100vw — avoids
 * double-counting rail+gap and uneven left/right vs viewport).
 */
export const ADMIN_PAGE_MAIN_COLLAPSED_MAX_WIDTH_CLASS = [
  'box-border min-w-0 w-full max-w-7xl lg:mx-auto px-4 sm:px-6 lg:px-8',
  ADMIN_PAGE_MAIN_COLLAPSED_SHIFT_LEFT_CLASS,
].join(' ');

/** sessionStorage: persist desktop sidebar icon-rail across admin navigations (each page mounts its own shell). */
export const ADMIN_SIDEBAR_DESKTOP_COLLAPSED_SESSION_STORAGE_KEY = 'mobee.admin.sidebarDesktopCollapsed';
