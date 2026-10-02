'use client';

import { Link } from '@/lib/i18n/navigation';

interface AparikConsentTogglesProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  agreePrefix: string;
  policyLabel: string;
  disabled?: boolean;
  error?: string;
}

export function AparikConsentToggles({
  checked,
  onChange,
  agreePrefix,
  policyLabel,
  disabled = false,
  error,
}: AparikConsentTogglesProps) {
  return (
    <div className="space-y-2" data-aparik-field="consents">
      <label className="flex cursor-pointer items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? 'bg-admin-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
            aria-hidden
          />
        </button>
        <span className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">
          {agreePrefix}{' '}
          <Link href="/credit" className="underline hover:text-admin-700">
            {policyLabel}
          </Link>
        </span>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
