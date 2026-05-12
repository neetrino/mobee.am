/**
 * Mobee pill — `bg-admin-500`, `rounded-full` (navbar categories tone; larger tap target, no menu icon).
 */
export const ORDERS_FILTER_DROPDOWN_TRIGGER_CLASS =
  'flex w-max max-w-[min(100vw-2rem,28rem)] min-h-10 flex-nowrap items-center justify-between gap-2 rounded-full bg-admin-500 px-4 py-2 text-left text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 active:opacity-90';

export const ORDERS_FILTER_DROPDOWN_CHEVRON_WRAP_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center text-white transition-transform duration-200 ease-out motion-reduce:transition-none';

/**
 * Flyout listbox outer width — wider than the pill so long “All …” rows stay readable (viewport-capped).
 * Inner panel — `CategoriesMenuFlyout` shell (`rounded-xl`, border, shadow).
 */
export const ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS =
  'max-w-[min(100vw-1rem,36rem)]';

export const ORDERS_FILTER_DROPDOWN_PANEL_CLASS =
  'max-h-56 overflow-y-auto overscroll-y-contain rounded-xl border border-gray-200/80 bg-white py-2 shadow-2xl';

export const ORDERS_FILTER_DROPDOWN_OPTION_CLASS =
  'flex w-full break-words px-3 py-2.5 text-left text-sm leading-snug text-gray-800 transition-colors hover:bg-gray-50';

export const ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS = 'bg-admin-50 font-semibold text-admin-800';
