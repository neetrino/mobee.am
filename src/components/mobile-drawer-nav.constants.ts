import { STOREFRONT_OVERLAY_ROOT_Z_INDEX_CLASS } from '../lib/storefront-overlay-layer.constants';

/**
 * Shared mobile drawer navigation chrome (Header main menu + supersudo admin drawer).
 * Keep in sync when adjusting Figma / Header mobile menu.
 */
export const MOBILE_DRAWER_NAV_BUTTON_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-pretty';

export const MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS = 'min-w-0 flex-1 pr-1 text-pretty';

/** Admin drawer rows — label flush left (avoid centered look in wide pills). */
export const MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_LABEL_CLASS} text-left`;

export const MOBILE_DRAWER_CTA_SOLID_ADMIN_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-2xl border border-admin-500 bg-admin-500 px-4 py-3 text-sm font-semibold normal-case text-white shadow-sm transition-colors hover:border-admin-600 hover:bg-admin-600 active:opacity-95 text-pretty';

/** Primary drawer links (e.g. Home / About / Contact) — blue hover. */
export const MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_CLASS} hover:!border-admin-300 hover:!bg-admin-50 hover:!text-[#00a1ff]`;

/** Admin mobile menu row — inactive (sentence-case labels). */
export const MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_CLASS} normal-case font-medium text-gray-800 hover:!border-admin-300 hover:!bg-admin-50 hover:!text-[#00a1ff] text-left`;

/** Admin mobile menu row — active. */
export const MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-2xl border border-admin-500 bg-admin-500 px-4 py-3 text-left text-sm font-semibold normal-case text-white shadow-sm transition-colors active:opacity-95 text-pretty';

/**
 * Products sub-rows (Categories / Brands / Attributes): 20px narrower than the nav rail, right-aligned.
 * Used in admin mobile drawer and desktop sidebar.
 */
export const MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS =
  'ml-auto min-w-0 !w-[calc(100%-20px)] max-w-full';

/** Drawer shell — fixed root + scrim + sliding panel (Header mobile menu). */
export const MOBILE_DRAWER_SHELL_ROOT_CLASS = `fixed inset-0 ${STOREFRONT_OVERLAY_ROOT_Z_INDEX_CLASS} lg:hidden`;

export const MOBILE_DRAWER_SHELL_BACKDROP_CLASS = 'absolute inset-0 bg-black/40';

/** Drawer panel — same width as Header mobile menu (`w-[min(83vw,24rem)]`), rounded on the right. */
export const MOBILE_DRAWER_SHELL_PANEL_CLASS =
  'relative z-10 flex h-dvh max-h-dvh min-w-[17rem] w-[min(83vw,24rem)] max-w-full flex-col overflow-hidden rounded-tr-[28px] rounded-br-[28px] bg-white shadow-2xl';

export const MOBILE_DRAWER_SHELL_TRANSITION_MS = 320;

export const MOBILE_DRAWER_SHELL_BACKDROP_MOTION_IN_CLASS = 'animate-mobile-drawer-backdrop-in';

export const MOBILE_DRAWER_SHELL_BACKDROP_MOTION_OUT_CLASS = 'animate-mobile-drawer-backdrop-out';

export const MOBILE_DRAWER_SHELL_PANEL_MOTION_IN_CLASS = 'animate-mobile-drawer-panel-in';

export const MOBILE_DRAWER_SHELL_PANEL_MOTION_OUT_CLASS = 'animate-mobile-drawer-panel-out';
