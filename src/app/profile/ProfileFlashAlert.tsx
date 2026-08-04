'use client';

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from 'react';

const PROFILE_FLASH_ALERT_VISIBLE_MS = 3200;

type ProfileFlashAlertVariant = 'success' | 'error';

interface ProfileFlashAlertProps {
  message: string | null | undefined;
  variant: ProfileFlashAlertVariant;
  onDismiss: () => void;
  className?: string;
}

const VARIANT_CLASS: Record<ProfileFlashAlertVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-600',
  error: 'border-red-200 bg-red-50 text-red-600',
};

/**
 * Profile inline flash banner — fades in, then fades out before clearing parent state.
 */
export function ProfileFlashAlert({
  message,
  variant,
  onDismiss,
  className = '',
}: ProfileFlashAlertProps) {
  const [displayedMessage, setDisplayedMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitStartedRef = useRef(false);
  const displayedRef = useRef<string | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current || !displayedRef.current) {
      return;
    }
    exitStartedRef.current = true;
    clearDismissTimer();
    setIsExiting(true);
  }, [clearDismissTimer]);

  useEffect(() => {
    if (message) {
      exitStartedRef.current = false;
      setIsExiting(false);
      displayedRef.current = message;
      setDisplayedMessage(message);
      clearDismissTimer();
      dismissTimerRef.current = setTimeout(beginExit, PROFILE_FLASH_ALERT_VISIBLE_MS);
      return clearDismissTimer;
    }
    beginExit();
    return clearDismissTimer;
  }, [message, beginExit, clearDismissTimer]);

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      if (!event.animationName.includes('fade-out')) {
        return;
      }
      displayedRef.current = null;
      setDisplayedMessage(null);
      setIsExiting(false);
      exitStartedRef.current = false;
      onDismiss();
    },
    [onDismiss],
  );

  if (!displayedMessage) {
    return null;
  }

  const motionClass = isExiting ? 'animate-fade-out' : 'animate-fade-in';

  return (
    <div
      className={`rounded-[15px] border p-4 ${VARIANT_CLASS[variant]} ${motionClass} ${className}`.trim()}
      role={variant === 'error' ? 'alert' : 'status'}
      onAnimationEnd={handleAnimationEnd}
    >
      <p className="text-sm">{displayedMessage}</p>
    </div>
  );
}
