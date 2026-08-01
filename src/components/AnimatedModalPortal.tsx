'use client';

import {
  useEffect,
  useState,
  type AnimationEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { STOREFRONT_OVERLAY_ROOT_Z_INDEX_CLASS } from '../lib/storefront-overlay-layer.constants';
import type { StorefrontModalPanelMotionVariant } from '../lib/storefront-modal-motion.constants';
import { useAnimatedModalDismiss } from '../lib/useAnimatedModalDismiss';

const DIALOG_FRAME_DEFAULT_CLASS =
  'fixed left-1/2 top-1/2 z-10 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4';

const BACKDROP_BASE_CLASS = 'absolute inset-0 bg-black/50';

const SHEET_PANEL_POSITION_CLASS = 'relative z-10';

export interface AnimatedModalPortalRenderApi {
  requestClose: () => void;
  panelMotionClass: string;
  handlePanelAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
}

interface AnimatedModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  closeAriaLabel: string;
  /** Dialog = centered (delete-confirm style). Sheet = bottom on mobile, centered on `sm+`. */
  panelMotionVariant?: StorefrontModalPanelMotionVariant;
  blockClose?: boolean;
  lockBodyScroll?: boolean;
  listenEscape?: boolean;
  /** Panel chrome classes (radius, border, max-height). Motion classes are applied by the shell. */
  panelClassName: string;
  /** Dialog centering frame width/position override. */
  dialogFrameClassName?: string;
  /** Root overlay z-index class override (e.g. nested confirm above a sheet). */
  rootZIndexClass?: string;
  backdropClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  panelProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'role' | 'children'>;
  children: ReactNode | ((api: AnimatedModalPortalRenderApi) => ReactNode);
}

/**
 * Shared storefront/admin modal shell — same stack as delete confirmation:
 * portal to `document.body`, animated backdrop/panel, body scroll lock, Escape.
 */
export function AnimatedModalPortal({
  isOpen,
  onClose,
  closeAriaLabel,
  panelMotionVariant = 'dialog',
  blockClose = false,
  lockBodyScroll = true,
  listenEscape = true,
  panelClassName,
  dialogFrameClassName = DIALOG_FRAME_DEFAULT_CLASS,
  rootZIndexClass = STOREFRONT_OVERLAY_ROOT_Z_INDEX_CLASS,
  backdropClassName = BACKDROP_BASE_CLASS,
  labelledBy,
  describedBy,
  panelProps,
  children,
}: AnimatedModalPortalProps) {
  const [isPortalReady, setIsPortalReady] = useState(false);

  const {
    isVisible,
    requestClose,
    handlePanelAnimationEnd,
    backdropMotionClass,
    panelMotionClass,
  } = useAnimatedModalDismiss({
    isOpen,
    onClose,
    blockClose,
    lockBodyScroll,
    listenEscape,
    panelMotionVariant,
  });

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  if (!isVisible || !isPortalReady) {
    return null;
  }

  const api: AnimatedModalPortalRenderApi = {
    requestClose,
    panelMotionClass,
    handlePanelAnimationEnd,
  };
  const content = typeof children === 'function' ? children(api) : children;
  const isSheet = panelMotionVariant === 'sheet';
  const rootClassName = isSheet
    ? `fixed inset-0 ${rootZIndexClass} flex flex-col justify-end sm:justify-center sm:p-4`
    : `fixed inset-0 ${rootZIndexClass}`;
  const resolvedPanelClassName = isSheet
    ? `${SHEET_PANEL_POSITION_CLASS} ${panelClassName} ${panelMotionClass}`
    : `${panelClassName} ${panelMotionClass}`;

  const panel = (
    <div
      {...panelProps}
      role="dialog"
      aria-modal="true"
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
      className={resolvedPanelClassName}
      onClick={(event) => event.stopPropagation()}
      onAnimationEnd={handlePanelAnimationEnd}
    >
      {content}
    </div>
  );

  const modal = (
    <div className={rootClassName}>
      <button
        type="button"
        className={`${backdropClassName} ${backdropMotionClass} ${blockClose ? 'pointer-events-none cursor-wait' : ''}`}
        aria-label={closeAriaLabel}
        onClick={() => {
          if (!blockClose) {
            requestClose();
          }
        }}
      />
      {isSheet ? panel : <div className={dialogFrameClassName}>{panel}</div>}
    </div>
  );

  return createPortal(modal, document.body);
}
