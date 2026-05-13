'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { computeTabletIpadAirLikeLayoutActive } from '@/lib/tablet-ipad-air-like-layout';
import { LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS } from '@/lib/tablet-ipad-air-like-layout.constants';

const TabletIpadAirLikeLayoutContext = createContext<boolean>(false);

function useSubscribeTabletIpadAirLikeActive(): boolean {
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    const apply = () => {
      setActive(computeTabletIpadAirLikeLayoutActive());
    };
    apply();
    window.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, []);

  return active;
}

export function TabletIpadAirLikeLayoutProvider({ children }: { children: ReactNode }) {
  const active = useSubscribeTabletIpadAirLikeActive();

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS, active);
    return () => {
      document.documentElement.classList.remove(LAYOUT_TABLET_IPAD_AIR_LIKE_HTML_CLASS);
    };
  }, [active]);

  return (
    <TabletIpadAirLikeLayoutContext.Provider value={active}>{children}</TabletIpadAirLikeLayoutContext.Provider>
  );
}

export function useTabletIpadAirLikeLayoutActive(): boolean {
  return useContext(TabletIpadAirLikeLayoutContext);
}
