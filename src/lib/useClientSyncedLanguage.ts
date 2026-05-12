'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_LANGUAGE, getStoredLanguage, type LanguageCode } from './language';

/**
 * Subscribes to `language-updated` (see {@link setStoredLanguage}).
 */
export function subscribeLanguageStore(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('language-updated', onStoreChange);
  return () => window.removeEventListener('language-updated', onStoreChange);
}

function getClientLanguageSnapshot(): LanguageCode {
  return getStoredLanguage();
}

function getServerLanguageSnapshot(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

/**
 * Language from localStorage, consistent with SSR: server and hydration use
 * {@link DEFAULT_LANGUAGE}, then the client reads storage (avoids hydration mismatches).
 */
export function useClientSyncedLanguage(): LanguageCode {
  return useSyncExternalStore(
    subscribeLanguageStore,
    getClientLanguageSnapshot,
    getServerLanguageSnapshot,
  );
}
