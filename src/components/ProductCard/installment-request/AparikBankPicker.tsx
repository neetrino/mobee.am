'use client';

import Image from 'next/image';
import { APARIK_BANK_OPTIONS, type AparikBankId } from '@/lib/aparik/banks.constants';

interface AparikBankPickerProps {
  selectedBankId: AparikBankId | null;
  onSelect: (bankId: AparikBankId) => void;
  disabled?: boolean;
  error?: string;
}

export function AparikBankPicker({
  selectedBankId,
  onSelect,
  disabled = false,
  error,
}: AparikBankPickerProps) {
  return (
    <div className="space-y-2" data-aparik-field="bankId">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {APARIK_BANK_OPTIONS.map((bank) => {
          const selected = selectedBankId === bank.id;
          return (
            <button
              key={bank.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(bank.id)}
              aria-pressed={selected}
              className={`relative flex h-20 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-24 ${
                bank.logoObjectFit === 'contain' ? 'p-2' : 'p-0'
              } ${
                selected
                  ? 'border-admin-500 bg-admin-50/40'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selected ? (
                <span
                  className="absolute right-1.5 top-1.5 z-10 flex size-4 items-center justify-center rounded-full bg-admin-500 text-white"
                  aria-hidden
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
              <Image
                src={bank.logoSrc}
                alt={bank.logoAlt}
                width={220}
                height={88}
                className={`h-full w-full ${
                  bank.logoObjectFit === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
