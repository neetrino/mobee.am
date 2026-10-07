'use client';

import {
  createContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/** Footer node inside the sheet, outside the scrolling body. */
export const AdminSheetFooterSlotContext = createContext<HTMLElement | null>(null);

const PANEL_TRANSITION_MS = 300;
const DEFAULT_DESKTOP_WIDTH_CLASS = 'lg:w-[36%]';

export interface AdminSideSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  footer?: ReactNode;
  children: ReactNode;
  blockClose?: boolean;
  desktopWidthClassName?: string;
  /** Replaces the default `w-[87%] max-w-sm` mobile width. */
  mobileWidthClassName?: string;
  bodyClassName?: string;
}

function subscribeNoop(): () => void {
  return () => undefined;
}

/**
 * Right-side admin panel (grill.am cart sheet): portal, slide-in, peek close tab.
 */
export function AdminSideSheet({
  open,
  onClose,
  title,
  closeLabel,
  footer,
  children,
  blockClose = false,
  desktopWidthClassName = DEFAULT_DESKTOP_WIDTH_CLASS,
  mobileWidthClassName = 'w-[87%] max-w-sm',
  bodyClassName = '',
}: AdminSideSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [openSnapshot, setOpenSnapshot] = useState(open);

  if (open !== openSnapshot) {
    setOpenSnapshot(open);
    if (open) {
      setRendered(true);
      setVisible(false);
    } else {
      setVisible(false);
    }
  }

  useEffect(() => {
    if (open && rendered) {
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(frameId);
      };
    }

    if (!open && rendered) {
      const timeoutId = window.setTimeout(() => {
        setRendered(false);
      }, PANEL_TRANSITION_MS);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [open, rendered]);

  useEffect(() => {
    if (!rendered) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || blockClose) {
        return;
      }
      if (document.querySelector('[data-app-confirm-modal]')) {
        return;
      }
      const sheets = document.querySelectorAll('[data-admin-side-sheet]');
      const topSheet = sheets[sheets.length - 1];
      if (topSheet && topSheet !== rootRef.current) {
        return;
      }
      onClose();
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [rendered, onClose, blockClose]);

  if (!mounted || !rendered) {
    return null;
  }

  function requestClose(): void {
    if (!blockClose) {
      onClose();
    }
  }

  return createPortal(
    <div
      ref={rootRef}
      data-admin-side-sheet=""
      className="fixed inset-0 z-[200] flex justify-end overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-side-sheet-title"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={closeLabel}
        className={`absolute inset-0 rounded-none bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={requestClose}
      />

      <div
        className={`relative h-dvh max-h-dvh transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 lg:max-w-none ${mobileWidthClassName} ${desktopWidthClassName} ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label={closeLabel}
          disabled={blockClose}
          className="absolute top-[22px] left-0 z-[1] flex h-[38px] w-20 -translate-x-1/2 items-center justify-center rounded-full bg-admin pr-10 text-white transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden
            className="translate-x-0.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <aside className="relative z-[2] flex h-full w-full flex-col overflow-hidden rounded-bl-3xl rounded-tl-3xl bg-white shadow-2xl">
          <header className="shrink-0 border-b border-gray-100 px-6 py-4 lg:px-5">
            <h2 id="admin-side-sheet-title" className="truncate text-xl font-bold leading-tight text-gray-900 lg:text-lg">
              {title}
            </h2>
          </header>
          <AdminSheetFooterSlotContext.Provider value={footerSlot}>
          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 lg:px-4 ${bodyClassName}`}>
            {children}
          </div>
          {footer ? <div className="shrink-0 border-t border-gray-100 px-5 py-4 lg:px-4">{footer}</div> : null}
          <div ref={setFooterSlot} className="shrink-0 empty:hidden" />
          </AdminSheetFooterSlotContext.Provider>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
