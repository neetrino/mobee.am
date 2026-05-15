/** Blue filter pill triggers on `/supersudo/orders` — 15px corner radius (Tailwind arbitrary). */
export const ORDERS_FILTER_DROPDOWN_TRIGGER_RADIUS_CLASS = 'rounded-[15px]';

/**
 * Mobee pill — `bg-admin-500`, `ORDERS_FILTER_DROPDOWN_TRIGGER_RADIUS_CLASS`.
 */
export const ORDERS_FILTER_DROPDOWN_TRIGGER_CLASS = [
  'flex w-max max-w-[min(100vw-2rem,28rem)] min-h-10 flex-nowrap items-center justify-between gap-2',
  ORDERS_FILTER_DROPDOWN_TRIGGER_RADIUS_CLASS,
  'bg-admin-500 px-4 py-2 text-left text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 active:opacity-90',
].join(' ');

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

/** Nudge order-row cell content down to align with status / payment controls (`1.5rem` ≈ 24px). */
export const ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS = 'translate-y-6';

/** Order # column: base `translate-y-7` (28px) + 5px. */
export const ORDER_ROW_ORDER_NUMBER_VERTICAL_CLASS = 'translate-y-[33px]';

/** Total price column: `ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS` + 5px (≈29px). */
export const ORDER_ROW_TOTAL_PRICE_VERTICAL_CLASS = 'translate-y-[29px]';

/**
 * Shared sizing for order-row status & payment pill triggers: same minimum width, grow with content
 * up to the table cell (`max-w-full`); labels use `break-words` so text stays fully visible.
 */
export const ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS =
  'min-w-[8rem] w-max max-w-full shrink-0';

/** @see ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS */
export const ORDER_ROW_STATUS_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS =
  ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS;

/** @see ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS */
export const ORDER_ROW_PAYMENT_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS =
  ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS;
