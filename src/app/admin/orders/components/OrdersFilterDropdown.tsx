'use client';

import {
  ORDERS_FILTER_DROPDOWN_CHEVRON_WRAP_CLASS,
  ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS,
  ORDERS_FILTER_DROPDOWN_OPTION_CLASS,
  ORDERS_FILTER_DROPDOWN_PANEL_CLASS,
  ORDERS_FILTER_DROPDOWN_TRIGGER_CLASS,
} from '../orders-filters.constants';

export type OrdersFilterOption = { value: string; label: string };

export interface OrdersFilterDropdownProps {
  id: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (next: string) => void;
  options: readonly OrdersFilterOption[];
  ariaLabel: string;
}

/**
 * Mobee-style filter pill + flyout for `/supersudo/orders` (categories shell, label + chevron only).
 */
export function OrdersFilterDropdown({
  id,
  isOpen,
  onOpenChange,
  value,
  onValueChange,
  options,
  ariaLabel,
}: OrdersFilterDropdownProps) {
  const displayLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

  return (
    <div className="relative inline-block max-w-full shrink-0">
      <button
        type="button"
        id={`${id}-trigger`}
        className={ORDERS_FILTER_DROPDOWN_TRIGGER_CLASS}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="min-w-0 flex-1 break-words text-left leading-snug">{displayLabel}</span>
        <span
          className={`${ORDERS_FILTER_DROPDOWN_CHEVRON_WRAP_CLASS} ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
          aria-hidden
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <>
          <div className="pointer-events-none absolute left-0 top-full z-[60] h-1 w-full" aria-hidden />
          <div
            id={`${id}-listbox`}
            role="listbox"
            className={`absolute left-0 top-full z-[60] min-w-full w-max pt-1 ${ORDERS_FILTER_DROPDOWN_FLYOUT_MAX_WIDTH_CLASS}`}
          >
            <div className={ORDERS_FILTER_DROPDOWN_PANEL_CLASS}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value === '' ? '__all__' : opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${ORDERS_FILTER_DROPDOWN_OPTION_CLASS} ${
                      active ? ORDERS_FILTER_DROPDOWN_OPTION_ACTIVE_CLASS : ''
                    }`}
                    onClick={() => {
                      onValueChange(opt.value);
                      onOpenChange(false);
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
