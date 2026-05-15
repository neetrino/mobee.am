'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/** Default visible time before exit animation (ms). */
const TOAST_DEFAULT_DURATION_MS = 3000;

/** Mobee storefront toast — aligns with contact / primary CTA (#2DB2FF). */
const TOAST_PANEL_SUCCESS_CLASS =
  'border-[#2DB2FF]/35 bg-[#EAF6FF] text-gray-900 ring-1 ring-[#2DB2FF]/15' as const;
const TOAST_PANEL_ERROR_CLASS =
  'border-red-200/90 bg-[#FFF5F5] text-gray-900 ring-1 ring-red-500/10' as const;
const TOAST_PANEL_WARNING_CLASS =
  'border-amber-200/90 bg-[#FFFBEB] text-gray-900 ring-1 ring-amber-500/10' as const;
const TOAST_PANEL_INFO_CLASS =
  'border-[#2DB2FF]/35 bg-[#EAF6FF] text-gray-900 ring-1 ring-[#2DB2FF]/15' as const;

const TOAST_ICON_SUCCESS = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const TOAST_ICON_ERROR = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const TOAST_ICON_WARNING = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);
const TOAST_ICON_INFO = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function ToastItem({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitStartedRef = useRef(false);

  const duration = toast.duration ?? TOAST_DEFAULT_DURATION_MS;

  const beginDismiss = useCallback(() => {
    if (exitStartedRef.current) {
      return;
    }
    exitStartedRef.current = true;
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setIsExiting(true);
  }, []);

  useEffect(() => {
    dismissTimerRef.current = setTimeout(beginDismiss, duration);
    return () => {
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [toast.id, duration, beginDismiss]);

  const handleAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.animationName.includes('fade-out')) {
        onClose(toast.id);
      }
    },
    [onClose, toast.id],
  );

  const bgColors = {
    success: TOAST_PANEL_SUCCESS_CLASS,
    error: TOAST_PANEL_ERROR_CLASS,
    warning: TOAST_PANEL_WARNING_CLASS,
    info: TOAST_PANEL_INFO_CLASS,
  };

  const iconColors = {
    success: 'text-[#2DB2FF]',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-[#2DB2FF]',
  };

  const icons = {
    success: TOAST_ICON_SUCCESS,
    error: TOAST_ICON_ERROR,
    warning: TOAST_ICON_WARNING,
    info: TOAST_ICON_INFO,
  };

  const motionClass = isExiting ? 'animate-fade-out' : 'animate-fade-in';

  return (
    <div
      className={`
        ${bgColors[toast.type]}
        pointer-events-auto mb-3 flex w-full max-w-md items-start gap-3 rounded-[14px]
        border p-4 shadow-md ${motionClass}
      `}
      role="alert"
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={`flex-shrink-0 ${iconColors[toast.type]}`}>{icons[toast.type]}</div>
      <div className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</div>
      <button
        type="button"
        onClick={beginDismiss}
        className="flex-shrink-0 rounded-md text-gray-500 transition-colors hover:text-[#2DB2FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DB2FF]/40"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<Omit<Toast, 'id'>>;
      if (!customEvent.detail) return;

      const newToast: Toast = {
        ...customEvent.detail,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      };
      setToasts((prev) => [...prev, newToast]);
    };

    window.addEventListener('show-toast', handleShowToast);

    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div className="flex w-full max-w-md flex-col items-center">
        {toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} toast={toastItem} onClose={handleClose} />
        ))}
      </div>
    </div>
  );
}

/**
 * Show a toast notification
 * @param message - The message to display
 * @param type - The type of toast (success, error, warning, info)
 * @param duration - Visible time before fade-out starts (ms; default 3000). Exit animation adds ~300ms.
 */
export function showToast(message: string, type: ToastType = 'info', duration?: number) {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent('show-toast', {
    detail: { message, type, duration },
  });
  window.dispatchEvent(event);
}
