'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  adminNavMarkPageReady,
  adminNavMarkRouteRender,
} from '@/lib/admin/admin-nav-debug';

/**
 * Marks route render + page ready for admin nav debug (dev only).
 * Call with `dataLoading=false` when primary data fetch completes.
 */
export function useAdminPageNavDebug(dataLoading: boolean): void {
  const pathname = usePathname();
  const route = pathname ?? '/supersudo';
  const markedRender = useRef(false);
  const markedReady = useRef(false);

  useEffect(() => {
    if (!markedRender.current) {
      markedRender.current = true;
      adminNavMarkRouteRender(route);
    }
  }, [route]);

  useEffect(() => {
    markedReady.current = false;
    markedRender.current = false;
  }, [route]);

  useEffect(() => {
    if (!dataLoading && !markedReady.current) {
      markedReady.current = true;
      adminNavMarkPageReady(route);
    }
  }, [dataLoading, route]);
}
