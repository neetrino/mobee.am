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

/**
 * Checkout option radios: custom paint so WebKit/Safari does not show a black inner dot
 * when combining `accent-color` with fixed control size.
 */
export const CHECKOUT_RADIO_ACCENT_CLASS =
  'appearance-none size-4 shrink-0 rounded-full border-2 border-gray-300 bg-white outline-none transition-[border-color,box-shadow] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:border-admin-500 checked:bg-[radial-gradient(circle_at_center,theme(colors.admin.500)_42%,theme(colors.white)_43%)]';
