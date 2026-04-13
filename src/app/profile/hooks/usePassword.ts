import { useState, type FormEvent } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UsePasswordProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function usePassword({ onError, onSuccess }: UsePasswordProps) {
  const { t } = useTranslation();
  
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    onError('');
    onSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onError(t('profile.password.passwordsDoNotMatch'));
      setSavingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      onError(t('profile.password.passwordMinLength'));
      setSavingPassword(false);
      return;
    }

    try {
      await apiClient.put('/api/v1/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      onSuccess(t('profile.password.changedSuccess'));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || t('profile.password.failedToChange'));
    } finally {
      setSavingPassword(false);
    }
  };

  return {
    passwordForm,
    setPasswordForm,
    savingPassword,
    handleChangePassword,
  };
}




