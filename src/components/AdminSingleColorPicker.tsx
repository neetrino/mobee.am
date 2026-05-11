'use client';

import { Input } from '@shop/ui';
import { useTranslation } from '../lib/i18n-client';
import { AdminDragColorPicker } from './AdminDragColorPicker';
import { PresetColorSwatchGrid } from './PresetColorSwatchGrid';
import { isValidHexColor } from '../lib/hexColorUtils';

export interface AdminSingleColorPickerProps {
  value: string | null;
  onChange: (next: string | null) => void;
  hexPlaceholder: string;
  hexHint: string;
}

/**
 * Preset swatches + drag-based hex picker (react-colorful) + optional hex field.
 */
export function AdminSingleColorPicker({
  value,
  onChange,
  hexPlaceholder,
  hexHint,
}: AdminSingleColorPickerProps) {
  const { t } = useTranslation();

  const handleHexTextChange = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    onChange(trimmed);
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

      <div className="space-y-3">
        <div>
          <span className="mb-2 block text-xs font-medium text-gray-600">
            {t('admin.attributes.valueModal.adjustColorDrag')}
          </span>
          <AdminDragColorPicker color={value} onChange={(hex) => onChange(hex)} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-600">{hexPlaceholder}</span>
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
      </div>

      <p className="text-xs text-gray-500">{hexHint}</p>
    </div>
  );
}
