import type { FormEvent } from 'react';
import { Button, Input } from '@shop/ui';
import { PROFILE_PILL_BUTTON_CLASS } from './profileUi.constants';
import { ProfileSectionCard } from './ProfileSectionCard';
import type { UserProfile } from './types';

interface ProfilePersonalInfoProps {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  setPersonalInfo: (info: ProfilePersonalInfoProps['personalInfo']) => void;
  savingPersonal: boolean;
  onSave: (e: FormEvent) => void;
  profile: UserProfile | null;
  t: (key: string) => string;
  /** When true, omit outer Card — modal/sheet already provides the frame. */
  embeddedInSheet?: boolean;
}

export function ProfilePersonalInfo({
  personalInfo,
  setPersonalInfo,
  savingPersonal,
  onSave,
  profile,
  t,
  embeddedInSheet = false,
}: ProfilePersonalInfoProps) {
  return (
    <ProfileSectionCard embeddedInSheet={embeddedInSheet}>
      {!embeddedInSheet ? (
        <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('profile.personal.title')}</h2>
      ) : null}
      <form onSubmit={onSave} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label={t('profile.personal.firstName')}
            value={personalInfo.firstName}
            onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
            placeholder={t('profile.personal.firstNamePlaceholder')}
          />
          <Input
            label={t('profile.personal.lastName')}
            value={personalInfo.lastName}
            onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
            placeholder={t('profile.personal.lastNamePlaceholder')}
          />
        </div>
        <Input
          label={t('profile.personal.email')}
          type="email"
          value={personalInfo.email}
          onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
          placeholder={t('profile.personal.emailPlaceholder')}
        />
        <Input
          label={t('profile.personal.phone')}
          type="tel"
          value={personalInfo.phone}
          onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
          placeholder={t('profile.personal.phonePlaceholder')}
        />
        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" variant="brand" className={PROFILE_PILL_BUTTON_CLASS} disabled={savingPersonal}>
            {savingPersonal ? (
              t('profile.personal.saving')
            ) : (
              <>
                <span className="md:hidden">{t('profile.personal.saveMobile')}</span>
                <span className="hidden md:inline">{t('profile.personal.save')}</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={PROFILE_PILL_BUTTON_CLASS}
            onClick={() => {
              setPersonalInfo({
                firstName: profile?.firstName || '',
                lastName: profile?.lastName || '',
                email: profile?.email || '',
                phone: profile?.phone || '',
              });
            }}
          >
            {t('profile.personal.cancel')}
          </Button>
        </div>
      </form>
    </ProfileSectionCard>
  );
}
