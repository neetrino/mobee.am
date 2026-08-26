'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '../api-client';
import { clearLegacyAuthStorage } from '../api-client/auth-utils';
import { mergeGuestCartIntoUserCart } from '../cart/guest-cart';
import { applyPendingWishlistProductAfterAuth } from '../wishlist/pendingWishlistAfterLogin';
import { reconcileWishlistWithCatalog } from '../wishlist/reconcileWishlistWithCatalog';

interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  /** @deprecated Session is HttpOnly cookie-only; always null. */
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  roles: string[];
  login: (_email: string, _password: string) => Promise<void>;
  register: (_data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthSessionResponse {
  user: User;
}

interface ProfileResponse {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfileToUser(profile: ProfileResponse): User {
  return {
    id: profile.id,
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
    firstName: profile.firstName ?? undefined,
    lastName: profile.lastName ?? undefined,
    roles: profile.roles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    clearLegacyAuthStorage();

    const loadSession = async () => {
      try {
        const profile = await apiClient.get<ProfileResponse>(
          '/api/v1/users/profile',
          { silentAuth: true }
        );
        setUser(mapProfileToUser(profile));
        void reconcileWishlistWithCatalog();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, []);

  const persistAuthUser = (sessionUser: User) => {
    if (!sessionUser?.id) {
      throw new Error('Invalid response from server');
    }
    clearLegacyAuthStorage();
    setUser(sessionUser);
    window.dispatchEvent(new Event('auth-updated'));
  };

  const mergeGuestCartAfterAuth = async () => {
    const result = await mergeGuestCartIntoUserCart();
    if (result.failed.length > 0) {
      return;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post<AuthSessionResponse>(
        '/api/v1/auth/login',
        { email: email.trim(), password },
        { skipAuth: true }
      );
      persistAuthUser(response.user);
      applyPendingWishlistProductAfterAuth();
      await mergeGuestCartAfterAuth();
      await reconcileWishlistWithCatalog();
    } catch (error: unknown) {
      let errorMessage = 'Login failed. Please try again.';

      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = error.message || 'Invalid email or password';
        } else if (error.status === 403) {
          errorMessage = error.message || 'Your account has been blocked';
        } else if (error.status === 400) {
          errorMessage = error.message || 'Please provide email and password';
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else {
        const err = error as { status?: number; message?: string };
        if (err.status === 401) {
          errorMessage = err.message || 'Invalid email or password';
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post<AuthSessionResponse>(
        '/api/v1/auth/register',
        data,
        { skipAuth: true }
      );
      persistAuthUser(response.user);
      applyPendingWishlistProductAfterAuth();
      await mergeGuestCartAfterAuth();
      await reconcileWishlistWithCatalog();
      router.refresh();
      router.replace('/');
    } catch (error: unknown) {
      let errorMessage = 'Registration failed. Please try again.';
      const err = error as {
        message?: string;
        data?: { detail?: string; message?: string };
      };

      if (err.data?.detail) {
        errorMessage = err.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Clear client state even if network fails
    }
    clearLegacyAuthStorage();
    setUser(null);
    window.dispatchEvent(new Event('auth-updated'));
    router.push('/');
  };

  const roles = user && Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin');

  const value: AuthContextType = {
    user,
    token: null,
    isLoggedIn: !!user,
    isLoading,
    isAdmin,
    roles,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
