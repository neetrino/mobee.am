'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS,
  ORDERS_FILTER_DROPDOWN_PANEL_CLASS,
  ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS,
  ORDER_ROW_SELECT_OPTION_CLASS,
  ORDER_ROW_SELECT_PORTAL_Z_INDEX_CLASS,
} from '../orders-filters.constants';

const ORDER_ROW_DROPDOWN_CHEVRON_WRAP_CLASS =
  'flex h-5 w-5 shrink-0 items-center justify-center text-gray-700 transition-transform duration-200 ease-out motion-reduce:transition-none';

export type OrderRowSelectOption = { value: string; label: string };

export interface OrderRowSelectDropdownProps {
  id: string;
  value: string;
  options: readonly OrderRowSelectOption[];
  onValueChange: (next: string) => void;
  /** Tint classes from `getStatusColor` / payment helpers. */
  triggerTintClassName: string;
  ariaLabel: string;
  /**
   * When true, status trigger uses shared cell sizing (`ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS`).
   */
  fixedStatusTriggerWidth?: boolean;
  /**
   * When true, payment trigger uses the same cell sizing as status.
   */
  fixedPaymentTriggerWidth?: boolean;
}

function useDismissOnOutsideAndEscape(
  isOpen: boolean,
  onDismiss: () => void,
  rootRef: RefObject<HTMLDivElement | null>,
  extraRefs: ReadonlyArray<RefObject<HTMLElement | null>>,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const containsAny = (node: Node | null) => {
      if (!node) {
        return false;
      }
      if (rootRef.current?.contains(node)) {
        return true;
      }
      for (const r of extraRefs) {
        if (r.current?.contains(node)) {
          return true;
        }
      }
      return false;
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!containsAny(event.target as Node)) {
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
  }, [isOpen, onDismiss, rootRef, extraRefs]);
}

interface PortalListboxProps {
  id: string;
  value: string;
  options: readonly OrderRowSelectOption[];
  onPick: (next: string) => void;
  portalRef: MutableRefObject<HTMLDivElement | null>;
  position: { top: number; left: number; width: number };
}

function PortalListbox({ id, value, options, onPick, portalRef, position }: PortalListboxProps) {
  const setPortalEl = useCallback(
    (el: HTMLDivElement | null) => {
      portalRef.current = el;
    },
    [portalRef],
  );

  return (
    <div
      ref={setPortalEl}
      className={`fixed ${ORDER_ROW_SELECT_PORTAL_Z_INDEX_CLASS} pt-1 ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: position.width,
      }}
    >
      <div id={`${id}-listbox`} role="listbox" className={ORDERS_FILTER_DROPDOWN_PANEL_CLASS}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={active}
              className={`${ORDER_ROW_SELECT_OPTION_CLASS} ${active ? ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS : ''}`}
              onClick={() => onPick(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Table cell status/payment dropdown: listbox is portaled to `document.body` with `fixed` placement
 * so it stacks above following rows and card overflow; options use centered labels.
 */
export function OrderRowSelectDropdown({
  id,
  value,
  options,
  onValueChange,
  triggerTintClassName,
  ariaLabel,
  fixedStatusTriggerWidth = false,
  fixedPaymentTriggerWidth = false,
}: OrderRowSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setIsOpen(false), []);

  const dismissExtraRefs = useMemo(
    () => [portalRef as RefObject<HTMLElement | null>],
    [],
  );

  useDismissOnOutsideAndEscape(isOpen, dismiss, rootRef, dismissExtraRefs);

  const displayLabel = options.find((o) => o.value === value)?.label ?? value;

  const handlePick = useCallback(
    (next: string) => {
      onValueChange(next);
      setIsOpen(false);
    },
    [onValueChange],
  );

  const useFixedTriggerWidth = fixedStatusTriggerWidth || fixedPaymentTriggerWidth;

  const triggerSizingClassName = useFixedTriggerWidth
    ? ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS
    : 'max-w-full min-w-0';

  useLayoutEffect(() => {
    if (!isOpen) {
      setPortalPosition(null);
      return;
    }
    const updatePosition = () => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const rect = root.getBoundingClientRect();
      setPortalPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative w-max max-w-full min-w-0">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-controls={`${id}-listbox`}
        className={`relative flex h-auto min-h-5 items-center justify-center overflow-hidden rounded-supersudo px-2.5 py-1.5 text-center text-xs font-medium ring-1 ring-black/5 transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-admin active:opacity-90 ${triggerTintClassName} ${triggerSizingClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="block w-full min-w-0 max-w-full whitespace-normal break-words px-6 text-center leading-snug">
          {displayLabel}
        </span>
        <span
          className={`${ORDER_ROW_DROPDOWN_CHEVRON_WRAP_CLASS} absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      {isOpen && portalPosition
        ? createPortal(
            <PortalListbox
              id={id}
              value={value}
              options={options}
              onPick={handlePick}
              portalRef={portalRef}
              position={portalPosition}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
