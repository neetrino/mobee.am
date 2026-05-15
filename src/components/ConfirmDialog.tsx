'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../lib/i18n-client';
import { acquireBodyScrollLock } from '../lib/body-scroll-lock';

/** Mobee-styled confirm (aligns with Toast / primary #2DB2FF). */
const CONFIRM_DIALOG_OVERLAY_CLASS =
  'fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4' as const;
const CONFIRM_DIALOG_PANEL_CLASS =
  'w-full max-w-md rounded-[14px] border border-[#2DB2FF]/35 bg-white p-6 shadow-xl ring-1 ring-[#2DB2FF]/15' as const;

export interface ConfirmDialogOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

type Queued = { options: ConfirmDialogOptions; resolve: (value: boolean) => void };

const queue: Queued[] = [];

type Notifier = (() => void) | null;
let notifier: Notifier = null;

export function setConfirmDialogNotifier(fn: Notifier) {
  notifier = fn;
}

/**
 * Shows a Mobee-styled confirm dialog. Resolves `true` if the user confirms.
 * Requires `ConfirmDialogContainer` mounted (e.g. in `ClientProviders`).
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    queue.push({ options, resolve });
    notifier?.();
  });
}

export function ConfirmDialogContainer() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Queued | null>(null);

  const pump = useCallback(() => {
    setActive((prev) => {
      if (prev !== null) {
        return prev;
      }
      return queue.shift() ?? null;
    });
  }, []);

  useEffect(() => {
    setConfirmDialogNotifier(pump);
    return () => {
      setConfirmDialogNotifier(null);
    };
  }, [pump]);

  const finish = useCallback((result: boolean) => {
    setActive((prev) => {
      if (prev) {
        prev.resolve(result);
      }
      return queue.shift() ?? null;
    });
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    return acquireBodyScrollLock();
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finish(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, finish]);

  if (!active) {
    return null;
  }

  const { options } = active;
  const cancelText = options.cancelLabel ?? t('common.buttons.cancel');
  const confirmText = options.confirmLabel ?? t('common.dialog.confirm');
  const isDanger = options.variant === 'danger';

  const confirmButtonClass = isDanger
    ? 'rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50'
    : 'rounded-[14px] bg-[#2DB2FF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DB2FF]/40';

  return (
    <div className={CONFIRM_DIALOG_OVERLAY_CLASS} role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={cancelText}
        onClick={() => finish(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        {...(options.title ? { 'aria-labelledby': 'confirm-dialog-title' } : {})}
        aria-describedby="confirm-dialog-message"
        className={`relative ${CONFIRM_DIALOG_PANEL_CLASS}`}
        onClick={(e) => e.stopPropagation()}
      >
        {options.title ? (
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
            {options.title}
          </h2>
        ) : null}
        <p
          id="confirm-dialog-message"
          className={`text-sm leading-relaxed text-gray-700 ${options.title ? 'mt-3' : ''}`}
        >
          {options.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="rounded-[14px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DB2FF]/30"
          >
            {cancelText}
          </button>
          <button type="button" onClick={() => finish(true)} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
