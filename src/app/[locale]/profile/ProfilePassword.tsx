import type { FormEvent } from 'react';
import { Button, Input } from '@shop/ui';
import { PROFILE_PILL_BUTTON_CLASS } from './profileUi.constants';
import { ProfileSectionCard } from './ProfileSectionCard';

interface ProfilePasswordProps {
  passwordForm: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  setPasswordForm: (form: ProfilePasswordProps['passwordForm']) => void;
  savingPassword: boolean;
  onSave: (e: FormEvent) => void;
  t: (key: string) => string;
  /** When true, omit outer Card — modal/sheet already provides the frame. */
  embeddedInSheet?: boolean;
}

export function ProfilePassword({
  passwordForm,
  setPasswordForm,
  savingPassword,
  onSave,
  t,
  embeddedInSheet = false,
}: ProfilePasswordProps) {
  return (
    <ProfileSectionCard embeddedInSheet={embeddedInSheet}>
      {!embeddedInSheet ? (
        <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('profile.password.title')}</h2>
      ) : null}
      <form onSubmit={onSave} className="max-w-2xl space-y-4">
        <Input
          label={t('profile.password.currentPassword')}
          type="password"
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          placeholder={t('profile.password.currentPasswordPlaceholder')}
          required
        />
        <Input
          label={t('profile.password.newPassword')}
          type="password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          placeholder={t('profile.password.newPasswordPlaceholder')}
          required
        />
        <Input
          label={t('profile.password.confirmPassword')}
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
          placeholder={t('profile.password.confirmPasswordPlaceholder')}
          required
        />
        <div className="pt-4">
          <Button type="submit" variant="brand" className={PROFILE_PILL_BUTTON_CLASS} disabled={savingPassword}>
            {savingPassword ? t('profile.password.changing') : t('profile.password.change')}
          </Button>
        </div>
      </form>
    </ProfileSectionCard>
  );
}
