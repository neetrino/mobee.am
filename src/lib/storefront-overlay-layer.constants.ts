/**
 * Storefront overlay stacking — above chrome (header/FAB z-50, bottom nav z-40).
 * Drawers/sheets portal to `document.body` so parent stacking contexts cannot trap them.
 */
export const STOREFRONT_OVERLAY_ROOT_Z_INDEX_CLASS = 'z-[200]' as const;

/** Nested confirms / dialogs above open sheets and drawers. */
export const STOREFRONT_NESTED_DIALOG_ROOT_Z_INDEX_CLASS = 'z-[220]' as const;
