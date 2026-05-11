import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../../../lib/layout-breakpoints.constants';
import { isProfileTabParam, type ProfileTab } from '../types';

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY).matches;
}

export function useProfileTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const initialFromUrl = isProfileTabParam(tabFromUrl) ? tabFromUrl : null;

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialFromUrl ?? 'dashboard');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (isProfileTabParam(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: ProfileTab) => {
      setActiveTab(tab);
      const path = `/profile?tab=${tab}`;
      if (isDesktopViewport()) {
        router.push(path, { scroll: false });
      } else {
        router.replace(path, { scroll: false });
      }
    },
    [router],
  );

  const closeProfileSheet = useCallback(() => {
    router.replace('/profile', { scroll: false });
  }, [router]);

  const openTabParam = searchParams.get('tab');
  const profileSheetOpen = isProfileTabParam(openTabParam);
  const highlightedTab: ProfileTab | null = profileSheetOpen ? activeTab : null;

  return {
    activeTab,
    handleTabChange,
    closeProfileSheet,
    profileSheetOpen,
    highlightedTab,
  };
}
