/** Shared storefront modal motion — backdrop, bottom sheet, centered dialog. */
export const STOREFRONT_MODAL_TRANSITION_MS = 320;

export const STOREFRONT_MODAL_BACKDROP_MOTION_IN_CLASS = 'animate-mobile-drawer-backdrop-in';

export const STOREFRONT_MODAL_BACKDROP_MOTION_OUT_CLASS = 'animate-mobile-drawer-backdrop-out';

/** Mobile bottom sheet; `sm+` uses dialog keyframes via CSS media query. */
export const STOREFRONT_MODAL_SHEET_PANEL_MOTION_IN_CLASS = 'animate-storefront-sheet-modal-panel-in';

export const STOREFRONT_MODAL_SHEET_PANEL_MOTION_OUT_CLASS = 'animate-storefront-sheet-modal-panel-out';

/** Centered dialog at all breakpoints. */
export const STOREFRONT_MODAL_DIALOG_PANEL_MOTION_IN_CLASS = 'animate-storefront-dialog-modal-panel-in';

export const STOREFRONT_MODAL_DIALOG_PANEL_MOTION_OUT_CLASS = 'animate-storefront-dialog-modal-panel-out';

export type StorefrontModalPanelMotionVariant = 'sheet' | 'dialog';

export function getStorefrontModalPanelMotionClass(
  isExiting: boolean,
  variant: StorefrontModalPanelMotionVariant,
): string {
  if (variant === 'dialog') {
    return isExiting
      ? STOREFRONT_MODAL_DIALOG_PANEL_MOTION_OUT_CLASS
      : STOREFRONT_MODAL_DIALOG_PANEL_MOTION_IN_CLASS;
  }
  return isExiting
    ? STOREFRONT_MODAL_SHEET_PANEL_MOTION_OUT_CLASS
    : STOREFRONT_MODAL_SHEET_PANEL_MOTION_IN_CLASS;
}

interface StorefrontModalPanelAnimationEndEvent {
  animationName: string;
}

export function isStorefrontModalPanelExitAnimation(
  event: StorefrontModalPanelAnimationEndEvent,
): boolean {
  return (
    event.animationName.includes('mobile-sheet-panel-out') ||
    event.animationName.includes('modal-dialog-panel-out')
  );
}
