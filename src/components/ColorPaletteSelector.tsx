'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from '../lib/i18n-client';
import { ADMIN_CUSTOM_COLOR_PICKER_SEED } from '../lib/adminColorPalette.constants';
import { AdminDragColorPicker } from './AdminDragColorPicker';
import { PresetColorSwatchGrid } from './PresetColorSwatchGrid';
import { normalizeHexToSixDigits } from '../lib/hexColorUtils';

interface ColorPaletteSelectorProps {
  colors: string[];
  onColorsChange: (colors: string[]) => void;
}

/**
 * Color Palette Selector Component
 * Allows selecting colors via custom color picker
 */
export function ColorPaletteSelector({ colors, onColorsChange }: ColorPaletteSelectorProps) {
  const { t } = useTranslation();
  const [customColor, setCustomColor] = useState(ADMIN_CUSTOM_COLOR_PICKER_SEED);

  const activeHexSet = useMemo(() => {
    return new Set(colors.map((c) => normalizeHexToSixDigits(c).toLowerCase()));
  }, [colors]);

  const handlePresetPick = (hex: string) => {
    const normalized = normalizeHexToSixDigits(hex);
    const key = normalized.toLowerCase();
    if (activeHexSet.has(key)) {
      return;
    }
    onColorsChange([...colors, normalized]);
  };

  const handleAddColor = () => {
    const normalized = normalizeHexToSixDigits(customColor);
    const key = normalized.toLowerCase();
    if (!activeHexSet.has(key)) {
      onColorsChange([...colors, normalized]);
      setCustomColor(ADMIN_CUSTOM_COLOR_PICKER_SEED);
    }
  };

  const handleRemoveColor = (index: number) => {
    onColorsChange(colors.filter((_, i) => i !== index));
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onColorsChange(newColors);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t('admin.attributes.valueModal.presetPalette')}
        </label>
        <PresetColorSwatchGrid
          onPick={handlePresetPick}
          activeHexSet={activeHexSet}
          ariaLabel={t('admin.attributes.valueModal.presetPalette')}
        />
      </div>

      {/* Selected Colors */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('admin.attributes.valueModal.selectedColors')} ({colors.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color, index) => (
              <div key={index} className="flex flex-wrap items-start gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                <details className="relative group">
                  <summary
                    className="block cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                    aria-label={t('admin.attributes.valueModal.adjustColorDrag')}
                  >
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-gray-300 shadow-sm transition hover:border-gray-500 group-open:ring-2 group-open:ring-admin group-open:ring-offset-2"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  </summary>
                  <div className="absolute left-0 top-full z-20 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                    <AdminDragColorPicker color={color} onChange={(hex) => handleColorChange(index, hex)} />
                  </div>
                </details>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="#000000"
                  aria-label={t('admin.attributes.valueModal.colors')}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveColor(index)}
                  className="text-admin-600 transition-colors hover:text-admin-800"
                  title={t('admin.attributes.valueModal.removeColor')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Color — drag picker + add to list */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t('admin.attributes.valueModal.addColor')}
        </label>
        <p className="mb-2 text-xs text-gray-500">{t('admin.attributes.valueModal.adjustColorDrag')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <AdminDragColorPicker
            color={customColor}
            onChange={setCustomColor}
            emptyFallbackHex={ADMIN_CUSTOM_COLOR_PICKER_SEED}
          />
          <button
            type="button"
            onClick={handleAddColor}
            disabled={activeHexSet.has(normalizeHexToSixDigits(customColor).toLowerCase())}
            className="cursor-pointer rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-default disabled:opacity-50"
          >
            {t('admin.attributes.valueModal.add')}
          </button>
        </div>
      </div>
    </div>
  );
}

