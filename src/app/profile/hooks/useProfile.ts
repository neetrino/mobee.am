import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import type { UserProfile } from '../types';

export function useProfile() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user: authUser } = useAuth();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login?redirect=/profile');
    }
  }, [isLoggedIn, authLoading, router]);

  // Load profile data
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      loadProfile();
    }
  }, [isLoggedIn, authLoading]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<UserProfile>('/api/v1/users/profile');
      setProfile(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error loading profile:', err);
      setError(errorMessage || t('profile.personal.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    setProfile,
    loading,
    error,
    success,
    setError,
    setSuccess,
    loadProfile,
    isLoggedIn,
    authLoading,
    authUser,
  };
}




