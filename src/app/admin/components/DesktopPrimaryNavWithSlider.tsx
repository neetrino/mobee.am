'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ADMIN_SIDEBAR_NAV_INDICATOR,
  ADMIN_SIDEBAR_NAV_SLIDE_MS,
} from '../admin-sidebar-layout.constants';
import styles from './AdminSidebarNav.module.css';
import {
  isNavRowVisible,
  isTabActive,
  PRODUCT_SUBMENU_IDS,
  renderPrimaryNavItem,
  type PrimaryNavListProps,
} from './AdminSidebarPrimaryNav.shared';

type IndicatorBox = { top: number; height: number };

/**
 * Desktop primary nav with Grill-style sliding active pill.
 */
export function DesktopPrimaryNavWithSlider(props: PrimaryNavListProps) {
  const { primaryTabs, currentPath, isProductsExpanded, desktopCollapsed } = props;
  const navRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);
  const [slideEnabled, setSlideEnabled] = useState(false);

  const activeId = useMemo(() => {
    const activeTab = primaryTabs.find((tab) => {
      if (!isNavRowVisible(tab, isProductsExpanded, Boolean(desktopCollapsed))) {
        return false;
      }
      if (tab.isSubCategory && !PRODUCT_SUBMENU_IDS.has(tab.id)) {
        return false;
      }
      return isTabActive(tab, currentPath);
    });
    return activeTab?.id ?? '';
  }, [primaryTabs, currentPath, isProductsExpanded, desktopCollapsed]);

  const visibleTabIds = useMemo(
    () =>
      primaryTabs
        .filter((tab) => isNavRowVisible(tab, isProductsExpanded, Boolean(desktopCollapsed)))
        .filter((tab) => !tab.isSubCategory || PRODUCT_SUBMENU_IDS.has(tab.id))
        .map((tab) => tab.id)
        .join('|'),
    [primaryTabs, isProductsExpanded, desktopCollapsed],
  );

  useLayoutEffect(() => {
    const row = rowRefs.current.get(activeId);
    if (!row) {
      return;
    }
    setIndicator({
      top: row.offsetTop,
      height: row.offsetHeight,
    });
  }, [activeId, visibleTabIds, desktopCollapsed]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setSlideEnabled(true);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') {
      return;
    }
    const update = () => {
      const row = rowRefs.current.get(activeId);
      if (!row) {
        return;
      }
      setIndicator({
        top: row.offsetTop,
        height: row.offsetHeight,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    for (const row of rowRefs.current.values()) {
      observer.observe(row);
    }
    return () => {
      observer.disconnect();
    };
  }, [activeId, visibleTabIds, desktopCollapsed]);

  function setRowRef(id: string, node: HTMLElement | null): void {
    if (node) {
      rowRefs.current.set(id, node);
      return;
    }
    rowRefs.current.delete(id);
  }

  return (
    <nav
      ref={navRef}
      className="relative space-y-1"
      style={
        {
          '--admin-nav-ms': `${ADMIN_SIDEBAR_NAV_SLIDE_MS}ms`,
        } as CSSProperties
      }
    >
      {indicator ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 z-0 rounded-[15px] border-l-4 ${
            slideEnabled ? styles.indicator : styles.indicatorInstant
          }`}
          style={{
            top: indicator.top,
            height: indicator.height,
            backgroundColor: ADMIN_SIDEBAR_NAV_INDICATOR.background,
            borderLeftColor: ADMIN_SIDEBAR_NAV_INDICATOR.border,
          }}
        />
      ) : null}
      {primaryTabs.map((tab) =>
        renderPrimaryNavItem(tab, {
          ...props,
          setRowRef,
          useSlidingIndicator: true,
        }),
      )}
    </nav>
  );
}
