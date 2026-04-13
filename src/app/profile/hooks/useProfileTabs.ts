import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProfileTab } from '../types';

export function useProfileTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ProfileTab) || 'dashboard';
  
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Update tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'personal', 'addresses', 'password', 'orders'].includes(tab)) {
      setActiveTab(tab as ProfileTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    router.push(`/profile?tab=${tab}`, { scroll: false });
  };

  return {
    activeTab,
    handleTabChange,
  };
}




