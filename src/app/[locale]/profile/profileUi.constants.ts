/**
 * Pill shape for profile page — overrides default `rounded-md` / `rounded-2xl` on @shop/ui Button.
 */
export const PROFILE_PILL_BUTTON_CLASS = '!rounded-full' as const;

/** Dashboard tab buttons — fixed 20px radius (not full pill). */
export const PROFILE_DASHBOARD_BUTTON_CLASS = '!rounded-[20px]' as const;

/**
 * Desktop left column (`ProfileHeader`) sticks under the fixed header primary strip (~62px)
 * with a small gap so the top of the block is not clipped.
 */
export const PROFILE_SIDEBAR_TOP_OFFSET_CSS = '5rem';

/** Breathing room under the sticky sidebar within the viewport. */
export const PROFILE_SIDEBAR_BOTTOM_OFFSET_CSS = '1rem';

/**
 * Outer sticky wrapper for the profile left column (desktop `lg+`).
 * `self-start` is required so grid stretch does not break sticky.
 */
export const PROFILE_SIDEBAR_STICKY_CLASS =
  'lg:sticky lg:top-[var(--profile-sidebar-top-offset)] lg:self-start lg:max-h-[calc(100dvh-var(--profile-sidebar-top-offset)-var(--profile-sidebar-bottom-offset))] lg:overflow-y-auto lg:overscroll-contain';
