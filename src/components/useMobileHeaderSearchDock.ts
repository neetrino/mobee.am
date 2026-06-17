'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../lib/layout-breakpoints.constants';

/** Scroll Y at or below this value restores the logo row (page fully at top). */
const MOBILE_HEADER_LOGO_RESTORE_SCROLL_Y_MAX_PX = 4;

type UseMobileHeaderSearchDockOptions = {
  searchQuery: string;
  searchDropdownOpen: boolean;
};

/**
 * Pins the mobile search toolbar once the logo row has scrolled off-screen.
 * Logo stays hidden on partial scroll-back until the page returns to the top.
 */
export function useMobileHeaderSearchDock({
  searchQuery,
  searchDropdownOpen,
}: UseMobileHeaderSearchDockOptions) {
  const logoRowRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchDropdownOpenRef = useRef(searchDropdownOpen);
  const searchQueryRef = useRef(searchQuery);
  const logoDismissedLatchRef = useRef(false);
  const [searchDocked, setSearchDocked] = useState(false);
  const [logoCollapsed, setLogoCollapsed] = useState(false);
  const [searchBarHeightPx, setSearchBarHeightPx] = useState(0);
  const [logoRowHeightPx, setLogoRowHeightPx] = useState(0);

  searchDropdownOpenRef.current = searchDropdownOpen;
  searchQueryRef.current = searchQuery;

  const syncDock = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY).matches) {
      logoDismissedLatchRef.current = false;
      setSearchDocked(false);
      setLogoCollapsed(false);
      setSearchBarHeightPx(0);
      setLogoRowHeightPx(0);
      return;
    }

    const searchWrap = searchWrapRef.current;
    if (searchWrap) {
      const height = Math.round(searchWrap.getBoundingClientRect().height);
      if (height > 0) {
        setSearchBarHeightPx(height);
      }
    }

    const logoRow = logoRowRef.current;
    if (logoRow) {
      const height = Math.round(logoRow.getBoundingClientRect().height);
      if (height > 0) {
        setLogoRowHeightPx(height);
      }
    }

    const blockDockForSearchUi =
      searchQueryRef.current.trim().length > 0 || searchDropdownOpenRef.current;
    const scrollY = window.scrollY;

    if (scrollY <= MOBILE_HEADER_LOGO_RESTORE_SCROLL_Y_MAX_PX && !blockDockForSearchUi) {
      logoDismissedLatchRef.current = false;
      setSearchDocked(false);
      setLogoCollapsed(false);
      return;
    }

    if (!logoRow) {
      return;
    }

    const logoScrolledPast = logoRow.getBoundingClientRect().bottom <= 0;
    if (logoScrolledPast && !blockDockForSearchUi) {
      logoDismissedLatchRef.current = true;
    }

    const shouldDock = logoDismissedLatchRef.current && !blockDockForSearchUi;
    setSearchDocked(shouldDock);
    setLogoCollapsed(shouldDock);
  }, []);

  useLayoutEffect(() => {
    syncDock();
    const searchWrap = searchWrapRef.current;
    const logoRow = logoRowRef.current;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(syncDock);
    if (searchWrap) {
      observer.observe(searchWrap);
    }
    if (logoRow) {
      observer.observe(logoRow);
    }
    return () => {
      observer.disconnect();
    };
  }, [syncDock]);

  useEffect(() => {
    syncDock();
    window.addEventListener('scroll', syncDock, { passive: true });
    window.addEventListener('resize', syncDock);
    return () => {
      window.removeEventListener('scroll', syncDock);
      window.removeEventListener('resize', syncDock);
    };
  }, [syncDock]);

  useEffect(() => {
    syncDock();
  }, [searchQuery, searchDropdownOpen, syncDock]);

  const flowSpacerPx =
    searchDocked && searchBarHeightPx > 0
      ? searchBarHeightPx + (logoCollapsed ? logoRowHeightPx : 0)
      : 0;

  return {
    logoRowRef,
    searchWrapRef,
    searchDocked,
    logoCollapsed,
    flowSpacerPx,
  };
}

/** @deprecated Use {@link useMobileHeaderSearchDock}. */
export const useMobileHomeSearchDock = useMobileHeaderSearchDock;
