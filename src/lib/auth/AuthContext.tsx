'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '../api-client';
import { mergeGuestCartIntoUserCart } from '../cart/guest-cart';
import { applyPendingWishlistProductAfterAuth } from '../wishlist/pendingWishlistAfterLogin';
import { reconcileWishlistWithCatalog } from '../wishlist/reconcileWishlistWithCatalog';

/**
 * User interface
 */
interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

/**
 * Auth Context interface
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  roles: string[];
  login: (_email: string, _password: string) => Promise<void>;
  register: (_data: RegisterData) => Promise<void>;
  logout: () => void;
}

/**
 * Register data interface
 */
interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Auth response from API
 */
interface AuthResponse {
  user: User;
  token: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

/**
 * Auth Provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load auth state from localStorage on mount
  useEffect(() => {
    console.log('🔐 [AUTH] Loading auth state from localStorage...');
    
    const loadAuthState = async () => {
      try {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = localStorage.getItem(AUTH_USER_KEY);

        if (storedToken && storedUser) {
          console.log('✅ [AUTH] Found stored auth data');
          const parsedUser = JSON.parse(storedUser);
          
          // If user doesn't have roles, fetch from API
          if (!parsedUser.roles || !Array.isArray(parsedUser.roles)) {
            console.log('⚠️ [AUTH] User data missing roles, fetching from API...');
            try {
              const rolePayload = await apiClient.get<{ roles: string[] }>('/api/v1/users/roles');
              if (rolePayload.roles) {
                parsedUser.roles = rolePayload.roles;
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(parsedUser));
                console.log('✅ [AUTH] Roles updated from API:', rolePayload.roles);
              }
            } catch (fetchError) {
              console.error('❌ [AUTH] Failed to fetch user roles:', fetchError);
            }
          }
          
          setToken(storedToken);
          setUser(parsedUser);
          void reconcileWishlistWithCatalog();
        } else {
          console.log('ℹ️ [AUTH] No stored auth data found');
        }
      } catch (error) {
        console.error('❌ [AUTH] Error loading auth state:', error);
        // Clear corrupted data
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const persistAuthResponse = (response: AuthResponse) => {
    if (!response?.token || !response.user?.id) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    window.dispatchEvent(new Event('auth-updated'));
  };

  const mergeGuestCartAfterAuth = async () => {
    const result = await mergeGuestCartIntoUserCart();
    if (result.failed.length > 0) {
      console.warn('⚠️ [AUTH] Guest cart merge partially failed', {
        merged: result.merged.length,
        failed: result.failed.length,
      });
      return;
    }

    if (result.merged.length > 0) {
      console.log('✅ [AUTH] Guest cart merged into user cart', {
        merged: result.merged.length,
      });
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    console.log('🔐 [AUTH] Login attempt:', { email: email ? 'provided' : 'not provided', password: password ? 'provided' : 'not provided' });
    
    try {
      setIsLoading(true);

      const requestData = { email: email.trim(), password };

      console.log('📤 [AUTH] Sending login request to API...');
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', requestData, {
        skipAuth: true, // Don't send token for login
      });

      console.log('✅ [AUTH] Login successful:', { 
        userId: response.user.id,
        roles: response.user.roles,
        isAdmin: response.user.roles?.includes('admin')
      });

      persistAuthResponse(response);
      applyPendingWishlistProductAfterAuth();
      await mergeGuestCartAfterAuth();
      await reconcileWishlistWithCatalog();

      // Don't redirect here - let the login page handle redirect based on query params
    } catch (error: unknown) {
      console.error('❌ [AUTH] Login error:', error);
      
      // Extract error message from API response
      let errorMessage = 'Login failed. Please try again.';
      
      // Check if it's an ApiError
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
        } else if (err.status === 403) {
          errorMessage = err.message || 'Your account has been blocked';
        } else if (err.status === 400) {
          errorMessage = err.message || 'Please provide email and password';
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData) => {
    console.log('🔐 [AUTH] Registration attempt:', { 
      email: data.email || 'not provided',
      phone: data.phone || 'not provided',
      hasFirstName: !!data.firstName,
      hasLastName: !!data.lastName
    });

    try {
      setIsLoading(true);

      console.log('📤 [AUTH] Sending registration request to API...', { data });
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', data, {
        skipAuth: true, // Don't send token for registration
      });

      console.log('✅ [AUTH] Registration response received:', response);

      persistAuthResponse(response);
      applyPendingWishlistProductAfterAuth();
      await mergeGuestCartAfterAuth();
      await reconcileWishlistWithCatalog();
      console.log('✅ [AUTH] Registration successful:', { userId: response.user.id });

      console.log('🔄 [AUTH] Redirecting to home page...');
      router.refresh();
      router.replace('/');
    } catch (error: any) {
      console.error('❌ [AUTH] Registration error:', error);
      console.error('❌ [AUTH] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Extract error message from API response
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message) {
        // Check if error has structured data
        if ((error as any).data && (error as any).data.detail) {
          errorMessage = (error as any).data.detail;
        } else if ((error as any).data && (error as any).data.message) {
          errorMessage = (error as any).data.message;
        } else {
          // Fallback to parsing error message
          const errorText = error.message;
          if (errorText.includes('409') || errorText.includes('already exists') || errorText.includes('User already exists')) {
            errorMessage = 'User with this email or phone already exists';
          } else if (errorText.includes('400') || errorText.includes('Validation failed')) {
            if (errorText.includes('password') || errorText.includes('Password')) {
              errorMessage = 'Password must be at least 6 characters';
            } else if (errorText.includes('email') || errorText.includes('phone')) {
              errorMessage = 'Please provide email or phone and password';
            } else {
              errorMessage = 'Invalid registration data. Please check your input.';
            }
          } else if (errorText.includes('500') || errorText.includes('Internal Server Error')) {
            errorMessage = 'Server error. Please try again later.';
          } else if (errorText.includes('Failed to parse')) {
            errorMessage = 'Invalid response from server. Please try again.';
          } else {
            // Try to extract meaningful message
            const match = errorText.match(/detail[:\s]+([^,\n]+)/i);
            if (match) {
              errorMessage = match[1].trim();
            }
          }
        }
      }

      console.error('❌ [AUTH] Final error message:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    console.log('🔐 [AUTH] Logging out...');
    
    // Clear auth data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    setToken(null);
    setUser(null);

    // Trigger auth update event
    window.dispatchEvent(new Event('auth-updated'));

    // Redirect to home page
    router.push('/');
  };

  // Calculate roles and admin status
  const roles = user && Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin');
  
  // Debug logging and ensure roles are loaded
  useEffect(() => {
    if (user && token) {
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      const userIsAdmin = userRoles.includes('admin');
      
      console.log('🔍 [AUTH] User state updated:', {
        userId: user.id,
        roles: user.roles,
        rolesArray: userRoles,
        isAdmin: userIsAdmin,
        rolesType: typeof user.roles,
        rolesIsArray: Array.isArray(user.roles)
      });
      
      // If user doesn't have roles, fetch from API
      if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
        console.log('⚠️ [AUTH] User missing roles, fetching from API...');
        apiClient.get<{ roles: string[] }>('/api/v1/users/profile')
          .then(profileData => {
            if (profileData.roles && Array.isArray(profileData.roles)) {
              const updatedUser = { ...user, roles: profileData.roles };
              setUser(updatedUser);
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
              console.log('✅ [AUTH] Roles updated from API:', profileData.roles);
            }
          })
          .catch(error => {
            console.error('❌ [AUTH] Failed to fetch user roles:', error);
          });
      }
    }
  }, [user, token]);

  const value: AuthContextType = {
    user,
    token,
    isLoggedIn: !!token && !!user,
    isLoading,
    isAdmin,
    roles,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

