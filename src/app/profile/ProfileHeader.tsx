'use client';

import { useRouter } from 'next/navigation';
import { UserAvatar } from '../../components/UserAvatar';
import { useAuth } from '../../lib/auth/AuthContext';
import { ProfileDeleteAccount } from './ProfileDeleteAccount';
import { ProfileMenuNav } from './ProfileMenuNav';
import type { UserProfile, ProfileTab, ProfileTabConfig } from './types';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  tabs: ProfileTabConfig[];
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  highlightedTab: ProfileTab | null;
  onOpenTab: (tab: ProfileTab) => void;
  t: (key: string) => string;
}

export function ProfileHeader({
  profile,
  tabs,
  activeTab,
  onTabChange,
  highlightedTab,
  onOpenTab,
  t,
}: ProfileHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex w-full flex-shrink-0 flex-col lg:sticky lg:top-8 lg:w-max lg:min-w-80 lg:max-w-2xl lg:self-start">
      {/* Mobile — карточки, меню-список, выход */}
      <div className="flex w-full flex-col gap-3 lg:hidden">
        <div className="w-full rounded-[15px] border border-admin-100 bg-white p-4 shadow-sm">
          <div className="flex flex-row items-center gap-4">
            <UserAvatar
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1 break-words">
              <h1 className="mb-1 break-words text-lg font-bold text-gray-900">
                {profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile?.firstName
                    ? profile.firstName
                    : profile?.lastName
                      ? profile.lastName
                      : t('profile.myProfile')}
              </h1>
              {profile?.email && (
                <p className="mb-1 break-words text-sm font-semibold text-gray-700 [overflow-wrap:anywhere]">
                  {profile.email}
                </p>
              )}
              {profile?.phone && <p className="break-words text-sm text-gray-500">{profile.phone}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-[15px] border border-admin-100 bg-white p-3 shadow-sm">
          <ProfileMenuNav tabs={tabs} openTab={highlightedTab} onOpenTab={onOpenTab} t={t} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-admin-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-admin-600 focus:outline-none focus:ring-2 focus:ring-admin-400 focus:ring-offset-2"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {t('common.navigation.logout')}
        </button>
      </div>

      {/* Desktop — как в коммите: аватар + боковое меню pill */}
      <div className="hidden w-full flex-col lg:flex">
        <div className="mb-4 w-full rounded-[15px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-row items-center gap-4">
            <UserAvatar
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1 break-words">
              <h1 className="mb-1 break-words text-lg font-bold text-gray-900">
                {profile?.firstName && profile?.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile?.firstName
                    ? profile.firstName
                    : profile?.lastName
                      ? profile.lastName
                      : t('profile.myProfile')}
              </h1>
              {profile?.email && (
                <p className="mb-1 break-words text-sm font-bold text-gray-900 [overflow-wrap:anywhere] lg:whitespace-nowrap">
                  {profile.email}
                </p>
              )}
              {profile?.phone && <p className="break-words text-sm text-gray-500">{profile.phone}</p>}
            </div>
          </div>
        </div>

        <aside className="w-full">
          <nav className="space-y-1 rounded-[15px] border border-gray-200 bg-white p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-admin text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`flex-shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`}>
                  {tab.icon}
                </span>
                <span className="text-left">{tab.label}</span>
              </button>
            ))}
            <ProfileDeleteAccount t={t} />
          </nav>
        </aside>
      </div>
    </div>
  );
}
