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

/** Home / Shop / About / Contact — blue hover. */
export const MOBILE_DRAWER_PRIMARY_NAV_LINK_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_CLASS} hover:!border-admin-300 hover:!bg-admin-50 hover:!text-[#00a1ff]`;

/** Admin mobile menu row — inactive (sentence-case labels). */
export const MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS = `${MOBILE_DRAWER_NAV_BUTTON_CLASS} normal-case font-medium text-gray-800 hover:!border-admin-300 hover:!bg-admin-50 hover:!text-[#00a1ff] text-left`;

/** Admin mobile menu row — active. */
export const MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-2xl border border-admin-500 bg-admin-500 px-4 py-3 text-left text-sm font-semibold normal-case text-white shadow-sm transition-colors active:opacity-95 text-pretty';

/** Admin drawer — Products submenu: `px-4` like siblings, shorter vertically (`py-2`, `text-xs`). */
export const MOBILE_DRAWER_ADMIN_SUBMENU_ITEM_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-left text-xs font-medium normal-case text-gray-600 shadow-sm transition-colors hover:border-admin-200 hover:bg-admin-50 hover:text-gray-900';

export const MOBILE_DRAWER_ADMIN_SUBMENU_ITEM_ACTIVE_CLASS =
  'flex w-full min-w-0 items-center justify-between rounded-lg border border-admin-400 bg-admin-500 px-4 py-2 text-left text-xs font-semibold normal-case text-white shadow-sm transition-colors active:opacity-95';

/** Drawer panel — same width as Header mobile menu (`w-[min(83vw,24rem)]`). */
export const MOBILE_DRAWER_SHELL_PANEL_CLASS =
  'flex h-full min-h-screen min-w-[17rem] w-[min(83vw,24rem)] max-w-full flex-col bg-white shadow-2xl';
