'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { STOREFRONT_MODAL_TRANSITION_MS } from '../lib/storefront-modal-motion.constants';
import { STOREFRONT_NESTED_DIALOG_ROOT_Z_INDEX_CLASS } from '../lib/storefront-overlay-layer.constants';
import { useTranslation } from '../lib/i18n-client';

/** Mobee-styled confirm (aligns with Toast / primary #2DB2FF). */
const CONFIRM_DIALOG_PANEL_CLASS =
  'w-full max-w-md rounded-[14px] border border-[#2DB2FF]/35 bg-white p-6 shadow-xl ring-1 ring-[#2DB2FF]/15' as const;

function ConfirmDialogPanel({
  title,
  message,
  cancelText,
  confirmText,
  confirmButtonClass,
  requestClose,
  requestCloseRef,
  onCancel,
  onConfirm,
}: {
  title?: string;
  message: string;
  cancelText: string;
  confirmText: string;
  confirmButtonClass: string;
  requestClose: () => void;
  requestCloseRef: MutableRefObject<() => void>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    requestCloseRef.current = requestClose;
  }, [requestClose, requestCloseRef]);

  return (
    <>
      {title ? (
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
      ) : null}
      <p
        id="confirm-dialog-message"
        className={`text-sm leading-relaxed text-gray-700 ${title ? 'mt-3' : ''}`}
      >
        {message}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[14px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DB2FF]/30"
        >
          {cancelText}
        </button>
        <button type="button" onClick={onConfirm} className={confirmButtonClass}>
          {confirmText}
        </button>
      </div>
    </>
  );
}

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
  const [isOpen, setIsOpen] = useState(false);
  const isClosingRef = useRef(false);
  const requestCloseRef = useRef<() => void>(() => {});

  const pump = useCallback(() => {
    setActive((prev) => {
      if (prev !== null) {
        return prev;
      }
      const next = queue.shift() ?? null;
      if (next) {
        isClosingRef.current = false;
        setIsOpen(true);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setConfirmDialogNotifier(pump);
    return () => {
      setConfirmDialogNotifier(null);
    };
  }, [pump]);

  const advanceQueueAfterClose = useCallback(() => {
    isClosingRef.current = false;
    setActive((prev) => {
      if (prev === null) {
        return null;
      }
      const next = queue.shift() ?? null;
      if (next) {
        setIsOpen(true);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isOpen || !isClosingRef.current) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      advanceQueueAfterClose();
    }, STOREFRONT_MODAL_TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, advanceQueueAfterClose]);

  const handlePortalClose = useCallback(() => {
    setActive((prev) => {
      if (prev && !isClosingRef.current) {
        prev.resolve(false);
      }
      return prev;
    });
    isClosingRef.current = true;
    setIsOpen(false);
  }, []);

  const finish = useCallback((result: boolean) => {
    setActive((prev) => {
      if (prev) {
        prev.resolve(result);
      }
      return prev;
    });
    isClosingRef.current = true;
    requestCloseRef.current();
    // Fallback if portal render-prop has not assigned requestClose yet.
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !active) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finish(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, active, finish]);

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
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={handlePortalClose}
      closeAriaLabel={cancelText}
      listenEscape={false}
      rootZIndexClass={STOREFRONT_NESTED_DIALOG_ROOT_Z_INDEX_CLASS}
      labelledBy={options.title ? 'confirm-dialog-title' : undefined}
      describedBy="confirm-dialog-message"
      backdropClassName="absolute inset-0 cursor-default bg-black/40"
      panelClassName={CONFIRM_DIALOG_PANEL_CLASS}
    >
      {({ requestClose }) => (
        <ConfirmDialogPanel
          title={options.title}
          message={options.message}
          cancelText={cancelText}
          confirmText={confirmText}
          confirmButtonClass={confirmButtonClass}
          requestClose={requestClose}
          requestCloseRef={requestCloseRef}
          onCancel={() => finish(false)}
          onConfirm={() => finish(true)}
        />
      )}
    </AnimatedModalPortal>
  );
}
