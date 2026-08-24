'use client';

import { useCallback, useEffect, useState, type AnimationEvent } from 'react';
import { acquireBodyScrollLock } from './body-scroll-lock';
import {
  getStorefrontModalPanelMotionClass,
  isStorefrontModalPanelExitAnimation,
  STOREFRONT_MODAL_BACKDROP_MOTION_IN_CLASS,
  STOREFRONT_MODAL_BACKDROP_MOTION_OUT_CLASS,
  STOREFRONT_MODAL_TRANSITION_MS,
  type StorefrontModalPanelMotionVariant,
} from './storefront-modal-motion.constants';

interface UseAnimatedModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  blockClose?: boolean;
  lockBodyScroll?: boolean;
  listenEscape?: boolean;
  panelMotionVariant?: StorefrontModalPanelMotionVariant;
}

export function useAnimatedModalDismiss({
  isOpen,
  onClose,
  blockClose = false,
  lockBodyScroll = false,
  listenEscape = true,
  panelMotionVariant = 'sheet',
}: UseAnimatedModalDismissOptions) {
  const [isExiting, setIsExiting] = useState(false);
  const isVisible = isOpen || isExiting;

  const requestClose = useCallback(() => {
    if (blockClose || isExiting || !isOpen) {
      return;
    }
    setIsExiting(true);
    onClose();
  }, [blockClose, isExiting, isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !isExiting) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setIsExiting(false);
    }, STOREFRONT_MODAL_TRANSITION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, isExiting]);

  useEffect(() => {
    if (!lockBodyScroll || !isVisible) {
      return;
    }
    return acquireBodyScrollLock();
  }, [isVisible, lockBodyScroll]);

  useEffect(() => {
    if (!listenEscape || !isVisible) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !blockClose) {
        requestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [listenEscape, isVisible, blockClose, requestClose]);

  const handlePanelAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (isStorefrontModalPanelExitAnimation(event)) {
      setIsExiting(false);
    }
  }, []);

  const backdropMotionClass = isExiting
    ? STOREFRONT_MODAL_BACKDROP_MOTION_OUT_CLASS
    : STOREFRONT_MODAL_BACKDROP_MOTION_IN_CLASS;

  const panelMotionClass = getStorefrontModalPanelMotionClass(isExiting, panelMotionVariant);

  return {
    isVisible,
    isExiting,
    requestClose,
    handlePanelAnimationEnd,
    backdropMotionClass,
    panelMotionClass,
  };
}
