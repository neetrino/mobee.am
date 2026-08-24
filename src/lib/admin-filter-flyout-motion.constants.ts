/** Admin filter / table-cell flyout open/close (orders filters, products stock, row selects). */
export const ADMIN_FILTER_FLYOUT_EXIT_MS = 160;

export const ADMIN_FILTER_FLYOUT_MOTION_IN_CLASS = 'animate-admin-filter-flyout-in';

export const ADMIN_FILTER_FLYOUT_MOTION_OUT_CLASS = 'animate-admin-filter-flyout-out';

export function getAdminFilterFlyoutMotionClass(isExiting: boolean): string {
  return isExiting ? ADMIN_FILTER_FLYOUT_MOTION_OUT_CLASS : ADMIN_FILTER_FLYOUT_MOTION_IN_CLASS;
}

interface AdminFilterFlyoutAnimationEndEvent {
  animationName: string;
}

export function isAdminFilterFlyoutExitAnimation(event: AdminFilterFlyoutAnimationEndEvent): boolean {
  return event.animationName.includes('admin-filter-flyout-out');
}
