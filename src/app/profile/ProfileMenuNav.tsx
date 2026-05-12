'use client';

import type { ProfileTab, ProfileTabConfig } from './types';
import { ProfileDeleteAccount } from './ProfileDeleteAccount';

interface ProfileMenuNavProps {
  tabs: ProfileTabConfig[];
  openTab: ProfileTab | null;
  onOpenTab: (tab: ProfileTab) => void;
  t: (key: string) => string;
}

function MenuChevron() {
  return (
    <svg className="ml-auto h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ProfileMenuNav({ tabs, openTab, onOpenTab, t }: ProfileMenuNavProps) {
  const rowBase =
    'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-colors';
  const rowIdle = 'border border-transparent text-gray-800 hover:bg-gray-50';
  const rowActive = 'border border-admin-200 bg-admin-50 text-admin-900';

  const iconWrap = (active: boolean) =>
    `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
      active ? 'bg-admin-200/60 text-admin-900' : 'bg-gray-100 text-gray-600'
    }`;

  return (
    <nav className="flex flex-col gap-1" aria-label={t('profile.myProfile')}>
      {tabs.map((tab) => {
        const active = openTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onOpenTab(tab.id)}
            className={`${rowBase} ${active ? rowActive : rowIdle}`}
          >
            <span className={iconWrap(active)} aria-hidden>
              {tab.icon}
            </span>
            <span className="min-w-0 flex-1 leading-snug">{tab.label}</span>
            <MenuChevron />
          </button>
        );
      })}

      <ProfileDeleteAccount t={t} variant="listRow" />
    </nav>
  );
}
