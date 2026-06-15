'use client';

import { useCallback, useEffect, useState, type AnimationEvent } from 'react';
import {
  ADMIN_FILTER_FLYOUT_EXIT_MS,
  getAdminFilterFlyoutMotionClass,
  isAdminFilterFlyoutExitAnimation,
} from './admin-filter-flyout-motion.constants';

/**
 * Keeps flyout mounted while exit animation runs after `isOpen` becomes false.
 */
export function useAnimatedFlyoutDismiss(isOpen: boolean) {
  const [isExiting, setIsExiting] = useState(false);
  const [trackedIsOpen, setTrackedIsOpen] = useState(isOpen);

  if (isOpen !== trackedIsOpen) {
    setTrackedIsOpen(isOpen);
    if (isOpen) {
      setIsExiting(false);
    } else {
      setIsExiting(true);
    }
  }

  const isVisible = isOpen || isExiting;

  useEffect(() => {
    if (isOpen || !isExiting) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setIsExiting(false);
    }, ADMIN_FILTER_FLYOUT_EXIT_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, isExiting]);

  const handleFlyoutAnimationEnd = useCallback((event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (isAdminFilterFlyoutExitAnimation(event)) {
      setIsExiting(false);
    }
  }, []);

  const flyoutMotionClass = getAdminFilterFlyoutMotionClass(isExiting);

  return {
    isVisible,
    flyoutMotionClass,
    handleFlyoutAnimationEnd,
  };
}
