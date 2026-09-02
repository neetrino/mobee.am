'use client';

import { DesktopPrimaryNavWithSlider } from './DesktopPrimaryNavWithSlider';
import {
  renderPrimaryNavItem,
  type PrimaryNavListProps,
} from './AdminSidebarPrimaryNav.shared';

export { isProductGroupPathActive, PRODUCT_GROUP_PATHS } from './AdminSidebarPrimaryNav.shared';
export type { PrimaryNavListProps } from './AdminSidebarPrimaryNav.shared';

export function PrimaryNavList(props: PrimaryNavListProps) {
  if (props.presentation === 'desktopSidebar') {
    return <DesktopPrimaryNavWithSlider {...props} />;
  }

  return <>{props.primaryTabs.map((tab) => renderPrimaryNavItem(tab, props))}</>;
}
