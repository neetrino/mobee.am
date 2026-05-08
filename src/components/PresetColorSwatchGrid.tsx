'use client';

import { ADMIN_PRESET_HEX_COLORS } from '../lib/adminColorPalette.constants';
import { hexEquals, normalizeHexToSixDigits } from '../lib/hexColorUtils';

export interface PresetColorSwatchGridProps {
  /** When omitted, uses shared admin preset list. */
  presetColors?: readonly string[];
  onPick: (hex: string) => void;
  /** Highlights matching swatch (single-value fields). */
  selectedHex?: string | null;
  /** Multi-select contexts: which hex values are already chosen. */
  activeHexSet?: ReadonlySet<string>;
  ariaLabel: string;
}

function normalizeKey(hex: string): string {
  return normalizeHexToSixDigits(hex).toLowerCase();
}

/**
 * Clickable preset color swatches for admin forms.
 */
export function PresetColorSwatchGrid({
  presetColors = ADMIN_PRESET_HEX_COLORS,
  onPick,
  selectedHex,
  activeHexSet,
  ariaLabel,
}: PresetColorSwatchGridProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      {presetColors.map((hex) => {
        const normalized = normalizeKey(hex);
        const isLight = hexEquals(hex, '#FFFFFF') || hexEquals(hex, '#F9FAFB');
        const isSelected = selectedHex != null && hexEquals(hex, selectedHex);
        const isActiveMulti = activeHexSet?.has(normalized) ?? false;

        return (
          <button
            key={hex}
            type="button"
            title={hex}
            aria-label={hex}
            aria-pressed={isSelected || isActiveMulti}
            onClick={() => onPick(normalizeHexToSixDigits(hex))}
            className={[
              'h-8 w-8 shrink-0 rounded-md border-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1',
              isLight ? 'border-gray-300' : 'border-transparent',
              isSelected || isActiveMulti ? 'ring-2 ring-admin ring-offset-1' : '',
            ].join(' ')}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
