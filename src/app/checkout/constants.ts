/**
 * Checkout page shell: full-width on small screens; capped width on `lg+` so form/summary cards read narrower.
 */
export const CHECKOUT_PAGE_SHELL_CLASS =
  'mx-auto w-full px-4 py-12 sm:px-6 lg:max-w-5xl lg:px-8';

/** `/checkout` form sections, order summary card, and in-card controls — 15px corners. */
export const CHECKOUT_FORM_CARD_RADIUS_CLASS = 'rounded-[15px]';

/**
 * `@shop/ui` {@link Card} adds `shadow-sm`; cart order summary uses a flat bordered panel — match that.
 */
export const CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS = 'shadow-none';

/** Selected shipping/payment option — Mobee brand blue (replaces purple accent). */
export const CHECKOUT_OPTION_SELECTED_CHROME_CLASS = 'border-admin-500 bg-admin-50';

/** Native `radio` accent color in checkout option lists. */
export const CHECKOUT_RADIO_ACCENT_CLASS = 'accent-admin-500';
