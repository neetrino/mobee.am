'use client';

import type { ProfileTab, ProfileTabConfig } from './types';
import { ProfileDeleteAccount } from './ProfileDeleteAccount';

const TILE_BASE_CLASS =
  'flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-[20px] px-3 py-4 text-center text-xs font-medium transition-colors sm:text-sm';

const ICON_WRAP_CLASS = 'flex shrink-0 items-center justify-center [&_svg]:h-7 [&_svg]:w-7';

interface ProfileMobileMenuGridProps {
  tabs: ProfileTabConfig[];
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  t: (key: string) => string;
}

/**
 * Mobile profile section switcher — 2×N grid (Figma-style tiles).
 */
export function ProfileMobileMenuGrid({ tabs, activeTab, onTabChange, t }: ProfileMobileMenuGridProps) {
  return (
    <nav
      className="mb-2 rounded-[15px] border border-gray-200 bg-white p-2.5 shadow-sm lg:hidden"
      aria-label={t('profile.mobileMenuNavAria')}
    >
      <div className="grid grid-cols-2 gap-2.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`${TILE_BASE_CLASS} ${
                isActive
                  ? 'bg-admin text-white [&_svg]:text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200/90 [&_svg]:text-gray-700'
              }`}
            >
              <span className={ICON_WRAP_CLASS}>{tab.icon}</span>
              <span className="line-clamp-2 leading-tight">{tab.label}</span>
            </button>
          );
        })}
        <ProfileDeleteAccount t={t} variant="grid" />
      </div>
    </nav>
  );
}
