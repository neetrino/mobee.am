'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_CLASS,
  ORDERS_FILTER_DROPDOWN_PANEL_CLASS,
  ORDER_ROW_CELL_DROPDOWN_TRIGGER_FIXED_WIDTH_CLASS,
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
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
  }, [isOpen, onDismiss, rootRef]);
}

interface OrderRowSelectFlyoutProps {
  id: string;
  value: string;
  options: readonly OrderRowSelectOption[];
  onPick: (next: string) => void;
}

function OrderRowSelectFlyout({ id, value, options, onPick }: OrderRowSelectFlyoutProps) {
  return (
    <>
      <div className="pointer-events-none absolute right-0 top-full z-[60] h-1 w-full" aria-hidden />
      <div
        id={`${id}-listbox`}
        role="listbox"
        className={`absolute right-0 top-full z-[60] min-w-full w-max pt-1 ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
      >
        <div className={ORDERS_FILTER_DROPDOWN_PANEL_CLASS}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`${ORDERS_FILTER_DROPDOWN_OPTION_CLASS} ${
                  active ? ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS : ''
                }`}
                onClick={() => onPick(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * Same flyout shell as `OrdersFilterDropdown` (blue pills row) — for table cell status controls.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setIsOpen(false), []);
  useDismissOnOutsideAndEscape(isOpen, dismiss, rootRef);

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

  return (
    <div ref={rootRef} className="relative w-max max-w-full min-w-0">
      <button
        type="button"
        id={`${id}-trigger`}
        className={`relative flex h-auto min-h-5 items-center justify-center overflow-hidden rounded-supersudo px-2.5 py-1.5 text-center text-xs font-medium ring-1 ring-black/5 transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-admin active:opacity-90 ${triggerTintClassName} ${triggerSizingClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
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
      {isOpen ? <OrderRowSelectFlyout id={id} value={value} options={options} onPick={handlePick} /> : null}
    </div>
  );
}
