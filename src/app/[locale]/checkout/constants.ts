/** Horizontal inset from the viewport on each side at `lg+`, px. */
export const CHECKOUT_PAGE_VIEWPORT_SIDE_INSET_PX = 150;

/**
 * Checkout page shell: responsive padding on small screens; `lg+` uses full width with
 * {@link CHECKOUT_PAGE_VIEWPORT_SIDE_INSET_PX}px side gutters so cards align ~150px from each edge.
 */
export const CHECKOUT_PAGE_SHELL_CLASS =
  'mx-auto w-full px-4 py-12 sm:px-6 lg:max-w-none lg:px-checkout-viewport-x';

/** `/checkout` form sections, order summary card, and in-card controls — 15px corners. */
export const CHECKOUT_FORM_CARD_RADIUS_CLASS = 'rounded-[15px]';

/** Top / bottom only — nested blocks inside a {@link CHECKOUT_FORM_CARD_RADIUS_CLASS} shell. */
export const CHECKOUT_FORM_CARD_RADIUS_TOP_CLASS = 'rounded-t-[15px]';
export const CHECKOUT_FORM_CARD_RADIUS_BOTTOM_CLASS = 'rounded-b-[15px]';

/**
 * `@shop/ui` {@link Card} adds `shadow-sm`; cart order summary uses a flat bordered panel — match that.
 */
export const CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS = 'shadow-none';

/**
 * Contact card field grid on `md+`: left column wider than right (name/email vs last name/phone).
 * Uses `11fr` / `9fr` — keep literal in string so Tailwind JIT emits the rule.
 */
export const CHECKOUT_CONTACT_FIELDS_GRID_CLASS =
  'grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,15fr)_minmax(0,15fr)]';

/** Selected shipping/payment option — Mobee brand blue (replaces purple accent). */
export const CHECKOUT_OPTION_SELECTED_CHROME_CLASS = 'border-admin-500 bg-admin-50';

/** Payment logo slot in `CheckoutForm`. */
export const CHECKOUT_PAYMENT_LOGO_SLOT_CLASS =
  'relative flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-white';

/** Wrapper for separate Visa / ArCa logo chips on the card payment option. */
export const CHECKOUT_PAYMENT_CARD_BRANDS_ROW_CLASS = 'flex shrink-0 items-center gap-1.5';

/** Individual logo chip inside {@link CHECKOUT_PAYMENT_CARD_BRANDS_ROW_CLASS}. */
export const CHECKOUT_PAYMENT_CARD_BRAND_CHIP_CLASS =
  'relative flex h-9 w-15 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-white';

export const CHECKOUT_PAYMENT_CARD_BRAND_IMG_CLASS = 'h-3.5 w-auto max-w-[2rem] object-contain';

/** Visa wordmark inside the brand chip — slightly larger mark, same chip frame. */
export const CHECKOUT_PAYMENT_CARD_BRAND_VISA_IMG_CLASS =
  'h-4 w-auto max-w-[2.25rem] object-contain scale-[1.28] origin-center';

/** Mastercard mark inside the brand chip — larger mark, same chip frame. */
export const CHECKOUT_PAYMENT_CARD_BRAND_MASTERCARD_IMG_CLASS =
  'h-4 w-auto max-w-[2.45rem] object-contain scale-[1.4] origin-center';

/** ArCa wordmark inside the brand chip — larger mark, same chip frame. */
export const CHECKOUT_PAYMENT_CARD_BRAND_ARCA_IMG_CLASS =
  'h-6 w-auto max-w-[3.25rem] object-contain scale-[2.12] origin-center';

/** Payment logo in the fixed slot (`CheckoutForm`). */
export const CHECKOUT_PAYMENT_LOGO_IMG_CLASS =
  'h-full w-full object-contain p-1';

/**
 * ArCa wordmark PNG — less padding + scale so the mark fills the frame more than Idram/cash.
 */
export const CHECKOUT_PAYMENT_LOGO_IMG_CLASS_ARCA =
  'w-full h-full object-contain p-0 scale-[1.18] origin-center';

/** Aparik logo — max scale within the standard payment logo frame. */
export const CHECKOUT_PAYMENT_LOGO_IMG_CLASS_APARIK =
  'w-full h-full object-contain p-0 scale-[1.48] origin-center';

/**
 * Checkout option radios: custom paint so WebKit/Safari does not show a black inner dot
 * when combining `accent-color` with fixed control size.
 */
export const CHECKOUT_RADIO_ACCENT_CLASS =
  'appearance-none size-4 shrink-0 rounded-full border-2 border-gray-300 bg-white outline-none transition-[border-color,box-shadow] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-50 checked:border-admin-500 checked:bg-[radial-gradient(circle_at_center,theme(colors.admin.500)_42%,theme(colors.white)_43%)]';

/** Checkout form custom select trigger (city, etc.) — aligns with {@link CHECKOUT_FORM_CARD_RADIUS_CLASS}. */
export const CHECKOUT_SELECT_TRIGGER_CLASS = [
  'flex w-full min-h-[42px] items-center justify-between gap-2 border px-4 py-2 text-left text-sm transition-[border-color,box-shadow]',
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
  'bg-white disabled:cursor-default disabled:bg-gray-50',
].join(' ');

export const CHECKOUT_SELECT_TRIGGER_FOCUS_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2';

export const CHECKOUT_SELECT_CHEVRON_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center text-gray-600 transition-transform duration-200 ease-out motion-reduce:transition-none';

export const CHECKOUT_SELECT_PANEL_CLASS = [
  'absolute left-0 right-0 top-[calc(100%+4px)] z-50 border border-gray-200/80 bg-white py-1.5 shadow-2xl',
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
].join(' ');

export const CHECKOUT_SELECT_OPTION_CLASS =
  'flex w-full px-4 py-2 text-left text-sm leading-snug text-gray-800 transition-colors hover:bg-gray-50';

export const CHECKOUT_SELECT_OPTION_ACTIVE_CLASS = 'bg-admin-50 font-semibold text-admin-800';
