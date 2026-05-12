import { ADMIN_SIDEBAR_DESKTOP_COLLAPSED_SESSION_STORAGE_KEY } from './admin-sidebar-layout.constants';

/**
 * Reads persisted desktop sidebar collapsed (icon rail) preference for the current tab session.
 */
export function readAdminSidebarDesktopCollapsedFromSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ADMIN_SIDEBAR_DESKTOP_COLLAPSED_SESSION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Persists desktop sidebar collapsed state so it survives client navigations between admin pages.
 */
export function writeAdminSidebarDesktopCollapsedToSession(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      ADMIN_SIDEBAR_DESKTOP_COLLAPSED_SESSION_STORAGE_KEY,
      collapsed ? '1' : '0',
    );
  } catch {
    // Ignore quota / private mode.
  }
}
