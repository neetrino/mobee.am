'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_CLASS,
  ORDERS_FILTER_DROPDOWN_PANEL_CLASS,
} from '../../orders/orders-filters.constants';

const PRODUCT_STOCK_FILTER_TRIGGER_CLASS =
  'flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 rounded-supersudo border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-900 shadow-sm transition-opacity hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-admin';

const PRODUCT_STOCK_FILTER_CHEVRON_WRAP_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center text-gray-600 transition-transform duration-200 ease-out motion-reduce:transition-none';

export type ProductStockFilterValue = 'all' | 'inStock' | 'outOfStock';

export interface ProductStockFilterOption {
  value: ProductStockFilterValue;
  label: string;
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

interface ProductStockFilterFlyoutProps {
  id: string;
  value: ProductStockFilterValue;
  options: readonly ProductStockFilterOption[];
  onPick: (next: ProductStockFilterValue) => void;
}

function ProductStockFilterFlyout({ id, value, options, onPick }: ProductStockFilterFlyoutProps) {
  return (
    <>
      <div className="pointer-events-none absolute left-0 top-full z-20 h-1 w-full" aria-hidden />
      <div
        id={`${id}-listbox`}
        role="listbox"
        className={`absolute left-0 top-full z-20 min-w-full w-max pt-1 ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
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

interface ProductStockFilterDropdownProps {
  id: string;
  value: ProductStockFilterValue;
  options: readonly ProductStockFilterOption[];
  onChange: (next: ProductStockFilterValue) => void;
  ariaLabel: string;
}

/**
 * Mobee flyout (same shell as `/supersudo/orders` filter pills) for stock filter on `/supersudo/products`.
 */
export function ProductStockFilterDropdown({
  id,
  value,
  options,
  onChange,
  ariaLabel,
}: ProductStockFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setIsOpen(false), []);
  useDismissOnOutsideAndEscape(isOpen, dismiss, rootRef);

  const displayLabel = options.find((o) => o.value === value)?.label ?? value;

  const handlePick = useCallback(
    (next: ProductStockFilterValue) => {
      onChange(next);
      setIsOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        id={`${id}-trigger`}
        className={PRODUCT_STOCK_FILTER_TRIGGER_CLASS}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 break-words leading-snug text-gray-800">{displayLabel}</span>
        <span
          className={`${PRODUCT_STOCK_FILTER_CHEVRON_WRAP_CLASS} ${isOpen ? 'rotate-180' : 'rotate-0'}`}
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
      {isOpen ? (
        <ProductStockFilterFlyout id={id} value={value} options={options} onPick={handlePick} />
      ) : null}
    </div>
  );
}
