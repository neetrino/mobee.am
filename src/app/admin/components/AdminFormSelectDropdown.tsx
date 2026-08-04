'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useAnimatedFlyoutDismiss } from '../../../lib/useAnimatedFlyoutDismiss';
import {
  ADMIN_FORM_SELECT_CHEVRON_WRAP_CLASS,
  ADMIN_FORM_SELECT_PLACEHOLDER_TEXT_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_SELECT_VALUE_TEXT_CLASS,
  ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_CLASS,
  ORDERS_FILTER_DROPDOWN_PANEL_CLASS,
  ORDER_ROW_SELECT_PORTAL_Z_INDEX_CLASS,
} from '../orders/orders-filters.constants';

export interface AdminFormSelectOption {
  value: string;
  label: string;
}

export interface AdminFormSelectDropdownProps {
  id: string;
  value: string;
  options: readonly AdminFormSelectOption[];
  onChange: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  /** Flyout stacking above adjacent form rows (default `z-20`). Ignored when `portalFlyout`. */
  flyoutZIndexClass?: string;
  /** Portal listbox to `document.body` (use inside overflow-clipped modals). */
  portalFlyout?: boolean;
}

interface PortalPosition {
  top: number;
  left: number;
  width: number;
}

function useDismissOnOutsideAndEscape(
  isOpen: boolean,
  onDismiss: () => void,
  rootRef: RefObject<HTMLDivElement | null>,
  portalRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const containsTarget = (node: Node | null) => {
      if (!node) {
        return false;
      }
      if (rootRef.current?.contains(node)) {
        return true;
      }
      return Boolean(portalRef.current?.contains(node));
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!containsTarget(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDismiss, rootRef, portalRef]);
}

function FlyoutOptions({
  id,
  value,
  options,
  onPick,
  flyoutMotionClass,
  onFlyoutAnimationEnd,
}: {
  id: string;
  value: string;
  options: readonly AdminFormSelectOption[];
  onPick: (next: string) => void;
  flyoutMotionClass: string;
  onFlyoutAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      id={`${id}-listbox`}
      role="listbox"
      className={`${ORDERS_FILTER_DROPDOWN_PANEL_CLASS} ${flyoutMotionClass}`}
      onAnimationEnd={onFlyoutAnimationEnd}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value === '' ? '__empty__' : option.value}
            type="button"
            role="option"
            aria-selected={active}
            className={`${ORDERS_FILTER_DROPDOWN_OPTION_CLASS} ${
              active ? ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS : ''
            }`}
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Mobee white-field select with animated flyout (delivery country/city, products stock filter).
 */
export function AdminFormSelectDropdown({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled = false,
  flyoutZIndexClass = 'z-20',
  portalFlyout = false,
}: AdminFormSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalPosition, setPortalPosition] = useState<PortalPosition | null>(null);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setIsOpen(false), []);
  const { isVisible, flyoutMotionClass, handleFlyoutAnimationEnd } = useAnimatedFlyoutDismiss(isOpen);
  useDismissOnOutsideAndEscape(isOpen, dismiss, rootRef, portalRef);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  const updatePortalPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setPortalPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!portalFlyout || !isVisible) {
      setPortalPosition(null);
      return;
    }
    updatePortalPosition();
    window.addEventListener('resize', updatePortalPosition);
    document.addEventListener('scroll', updatePortalPosition, true);
    return () => {
      window.removeEventListener('resize', updatePortalPosition);
      document.removeEventListener('scroll', updatePortalPosition, true);
    };
  }, [portalFlyout, isVisible, updatePortalPosition]);

  const matchedOption = options.find((option) => option.value === value);
  const displayLabel = matchedOption?.label ?? placeholder ?? '';
  const isPlaceholder = !matchedOption && Boolean(placeholder);

  const handlePick = useCallback(
    (next: string) => {
      onChange(next);
      setIsOpen(false);
    },
    [onChange],
  );

  const flyout = isVisible ? (
    portalFlyout && portalPosition && isPortalReady ? (
      createPortal(
        <div
          ref={portalRef}
          className={`fixed ${ORDER_ROW_SELECT_PORTAL_Z_INDEX_CLASS} ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
          style={{
            top: portalPosition.top,
            left: portalPosition.left,
            minWidth: portalPosition.width,
          }}
        >
          <FlyoutOptions
            id={id}
            value={value}
            options={options}
            onPick={handlePick}
            flyoutMotionClass={flyoutMotionClass}
            onFlyoutAnimationEnd={handleFlyoutAnimationEnd}
          />
        </div>,
        document.body,
      )
    ) : !portalFlyout ? (
      <>
        <div
          className={`pointer-events-none absolute left-0 top-full ${flyoutZIndexClass} h-1 w-full`}
          aria-hidden
        />
        <div
          className={`absolute left-0 top-full ${flyoutZIndexClass} min-w-full w-max pt-1 ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
        >
          <FlyoutOptions
            id={id}
            value={value}
            options={options}
            onPick={handlePick}
            flyoutMotionClass={flyoutMotionClass}
            onFlyoutAnimationEnd={handleFlyoutAnimationEnd}
          />
        </div>
      </>
    ) : null
  ) : null;

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        id={`${id}-trigger`}
        className={ADMIN_FORM_SELECT_TRIGGER_CLASS}
        aria-expanded={isVisible}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open);
          }
        }}
      >
        <span
          className={`min-w-0 flex-1 break-words leading-snug ${
            isPlaceholder ? ADMIN_FORM_SELECT_PLACEHOLDER_TEXT_CLASS : ADMIN_FORM_SELECT_VALUE_TEXT_CLASS
          }`}
        >
          {displayLabel}
        </span>
        <span
          className={`${ADMIN_FORM_SELECT_CHEVRON_WRAP_CLASS} ${isVisible ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {flyout}
    </div>
  );
}
