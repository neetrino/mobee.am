import { describe, expect, it } from 'vitest';
import {
  buildCompareSpecTableRows,
  extractCompareProductSpecs,
} from './extract-compare-product-specs';

const LAPTOP_SPECS_HTML =
  '<table class="product-specs"><tbody>' +
  '<tr class="specs-section specs-section--general"><td colspan="2"><span class="specs-section-title">Հիմնական</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">macOS</td><td class="spec-value">Օպերացիոն համակարգ</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Notebook</td><td class="spec-value">Տեսակ</td></tr>' +
  '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-title">Էկրան</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">16.2 inch (41.148 cm)</td><td class="spec-value">Էկրանի անկյունագիծ</td></tr>' +
  '</tbody></table>';

describe('extractCompareProductSpecs', () => {
  it('extracts normalized labels and values from description HTML', () => {
    const specs = extractCompareProductSpecs('hy', 'p-1', {
      description: LAPTOP_SPECS_HTML,
    });

    expect(specs.some((row) => row.label.includes('Օպերացիոն') && row.value === 'macOS')).toBe(true);
    expect(specs.some((row) => row.label.includes('անկյունագիծ') && row.value.includes('16.2 inch'))).toBe(
      true,
    );
  });

  it('builds aligned rows for multiple products', () => {
    const rows = buildCompareSpecTableRows(
      [
        { id: 'a', description: LAPTOP_SPECS_HTML },
        { id: 'b', description: LAPTOP_SPECS_HTML },
      ],
      'hy',
    );

    expect(rows.length).toBeGreaterThan(0);
    const osRow = rows.find((row) => row.label.includes('Օպերացիոն'));
    expect(osRow?.valuesByProductId.get('a')).toBe('macOS');
    expect(osRow?.valuesByProductId.get('b')).toBe('macOS');
  });
});
