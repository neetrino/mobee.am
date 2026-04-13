'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface InstantSearchResultItem {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  category: string | null;
}

export interface UseInstantSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  lang?: string;
}

export function useInstantSearch(options: UseInstantSearchOptions = {}) {
  const {
    debounceMs = 200,
    minQueryLength = 1,
    maxResults = 8,
    lang = 'en',
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstantSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([]);
        setError(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: String(maxResults),
          lang,
        });
        const res = await fetch(`/api/search/instant?${params.toString()}`, {
          signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.details || `Search failed: ${res.status}`);
        }

        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setResults([]);
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [minQueryLength, maxResults, lang]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (query.trim().length < minQueryLength) {
      setResults([]);
      setError(null);
      setSelectedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      performSearch(query.trim());
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs, minQueryLength, performSearch]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedIndex(-1);
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [isOpen, results.length]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setLoading(false);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    performSearch,
    handleKeyDown,
    clearSearch,
  };
}
