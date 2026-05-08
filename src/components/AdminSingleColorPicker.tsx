'use client';

import { useRef } from 'react';
import { Input } from '@shop/ui';
import { useTranslation } from '../lib/i18n-client';
import { PresetColorSwatchGrid } from './PresetColorSwatchGrid';
import { hexForColorInput, isValidHexColor, normalizeHexToSixDigits } from '../lib/hexColorUtils';

export interface AdminSingleColorPickerProps {
  value: string | null;
  onChange: (next: string | null) => void;
  hexPlaceholder: string;
  hexHint: string;
}

/**
 * Preset palette + native color input + hex text field for a single optional color.
 */
export function AdminSingleColorPicker({
  value,
  onChange,
  hexPlaceholder,
  hexHint,
}: AdminSingleColorPickerProps) {
  const { t } = useTranslation();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const pickerValue = hexForColorInput(value || undefined);

  const handleHexTextChange = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    onChange(trimmed);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(normalizeHexToSixDigits(e.target.value));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 block text-sm font-medium text-gray-700">
          {t('admin.attributes.valueModal.presetPalette')}
        </p>
        <PresetColorSwatchGrid
          onPick={(hex) => onChange(hex)}
          selectedHex={value && isValidHexColor(value) ? value : null}
          ariaLabel={t('admin.attributes.valueModal.presetPalette')}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {t('admin.attributes.valueModal.customColor')}
          </span>
          <div className="relative inline-block">
            <button
              type="button"
              className="h-10 w-10 rounded-lg border-2 border-gray-300 shadow-sm transition-colors hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1"
              style={{ backgroundColor: pickerValue }}
              onClick={() => colorInputRef.current?.click()}
              title={t('admin.attributes.valueModal.customColor')}
              aria-label={t('admin.attributes.valueModal.customColor')}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={pickerValue}
              onChange={handlePickerChange}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </div>

        <div className="min-w-[10rem] flex-1">
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleHexTextChange(e.target.value)}
            placeholder={hexPlaceholder}
            className="w-full"
            aria-label={hexPlaceholder}
          />
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1"
          >
            {t('admin.attributes.valueModal.clearColor')}
          </button>
        ) : null}
      </div>

      <p className="text-xs text-gray-500">{hexHint}</p>
    </div>
  );
}
