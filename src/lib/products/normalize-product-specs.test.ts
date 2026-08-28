import { describe, expect, it } from 'vitest';
import {
  looksLikeSpecLabel,
  looksLikeSpecValue,
  shouldSwapSpecRow,
} from './product-spec-heuristics';
import {
  classifySpecValue,
  isCompatibleSpecPair,
  recoverLabelKeyForValue,
  resolveGenericLabelKeyByValue,
} from './product-spec-semantic';
import {
  normalizeProductSpecSections,
  normalizeProductSpecsHtml,
  parseProductSpecsTableItems,
} from './normalize-product-specs';

const LAPTOP_SPECS_HTML =
  '<p class="product-status">Առկա է խանութներում · macOS</p>' +
  '<table class="product-specs"><tbody>' +
  '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Էկրան</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">16.2 inch (41.148 cm)</td><td class="spec-value">Էկրանի անկյունագիծ</td></tr>' +
  '<tr class="specs-section specs-section--memory"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Հիշողություն</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">1 TB</td><td class="spec-value">Ներկառուցված հիշողություն</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">48GB</td><td class="spec-value">Օպերատիվ հիշողություն</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">SSD</td><td class="spec-value">Կոշտ սկավառակի տեսակ</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">48GB</td><td class="spec-value">Գրաֆիկական հիշողություն</td></tr>' +
  '<tr class="specs-section specs-section--general"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Հիմնական</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Notebook</td><td class="spec-value">Տեսակ</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">macOS</td><td class="spec-value">Օպերացիոն համակարգ</td></tr>' +
  '<tr class="specs-section specs-section--network"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Կապ</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Այո</td><td class="spec-value">Bluetooth</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Այո</td><td class="spec-value">WiFi</td></tr>' +
  '<tr class="specs-section specs-section--other"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Այլ</span></td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Space Black</td><td class="spec-value">Գույն</td></tr>' +
  '<tr class="spec-row"><td class="spec-label">Այո</td><td class="spec-value">Վեբ տեսախցիկ</td></tr>' +
  '</tbody></table>';

function specRow(label: string, value: string): string {
  return `<tr class="spec-row"><td class="spec-label">${label}</td><td class="spec-value">${value}</td></tr>`;
}

function specsTable(rows: string): string {
  return `<table class="product-specs"><tbody>${rows}</tbody></table>`;
}

describe('product spec semantic validation', () => {
  it('classifies processor GPU strings as processor, not screen resolution', () => {
    expect(classifySpecValue('2x4.26 GHz + 4xX.X GHz Apple GPU (5-core graphics)')).toBe('processor');
    expect(recoverLabelKeyForValue('2x4.26 GHz + 4xX.X GHz Apple GPU (5-core graphics)')).toBe(
      'product.specs.labels.processor',
    );
  });

  it('classifies appliance sizes as dimensions, not screen resolution', () => {
    expect(classifySpecValue('80x49x25.5սմ')).toBe('dimensions');
    expect(classifySpecValue('85 x 60 x 56 սմ')).toBe('dimensions');
    expect(classifySpecValue('80x49սմ')).toBe('dimensions');
    expect(classifySpecValue('1640 x 2360')).toBe('screen_resolution');
    expect(recoverLabelKeyForValue('80x49x25.5սմ')).toBe('product.specs.labels.dimensions');
    expect(isCompatibleSpecPair('product.specs.labels.dimensions', '80x49x25.5սմ')).toBe(true);
  });

  it('classifies warranty and year patterns', () => {
    expect(classifySpecValue('12 months')).toBe('warranty');
    expect(classifySpecValue('1 year')).toBe('warranty');
    expect(recoverLabelKeyForValue('12 months')).toBe('product.specs.labels.warranty');
  });

  it('uses raw label context for GB values', () => {
    expect(classifySpecValue('48GB', { rawLabel: 'Օպերատիվ հիշողություն' })).toBe('ram');
    expect(classifySpecValue('256 GB', { rawLabel: 'Հիշողություն' })).toBe('storage_capacity');
    expect(classifySpecValue('256GB', { rawLabel: 'Օպերատիվ հիշողություն' })).toBe('storage_capacity');
  });

  it('classifies values and rejects invalid storage pairs', () => {
    expect(classifySpecValue('Notebook')).toBe('device_type');
    expect(classifySpecValue('1 TB')).toBe('storage_capacity');
    expect(classifySpecValue('SSD')).toBe('storage_type');
    expect(classifySpecValue('48GB')).toBe('ram');
    expect(classifySpecValue('macOS')).toBe('operating_system');

    expect(isCompatibleSpecPair('product.specs.labels.builtInStorage', 'Notebook')).toBe(false);
    expect(isCompatibleSpecPair('product.specs.labels.builtInStorage', '1 TB')).toBe(true);
    expect(recoverLabelKeyForValue('Notebook')).toBe('product.specs.labels.deviceType');
  });

  it('resolves ambiguous generic labels by value', () => {
    expect(resolveGenericLabelKeyByValue('Storage', '1 TB')).toBe('product.specs.labels.builtInStorage');
    expect(resolveGenericLabelKeyByValue('Storage', 'SSD')).toBe('product.specs.labels.storageType');
    expect(resolveGenericLabelKeyByValue('Storage', 'Notebook')).toBe('product.specs.labels.deviceType');
    expect(resolveGenericLabelKeyByValue('Type', 'Notebook')).toBe('product.specs.labels.deviceType');
    expect(resolveGenericLabelKeyByValue('Type', 'SSD')).toBe('product.specs.labels.storageType');
    expect(resolveGenericLabelKeyByValue('Memory', '48GB')).toBe('product.specs.labels.ram');
  });
});

describe('product spec heuristics', () => {
  it('detects typical values and labels', () => {
    expect(looksLikeSpecValue('48GB')).toBe(true);
    expect(looksLikeSpecValue('1 TB')).toBe(true);
    expect(looksLikeSpecValue('macOS')).toBe(true);
    expect(looksLikeSpecValue('SSD')).toBe(true);
    expect(looksLikeSpecValue('Այո')).toBe(true);

    expect(looksLikeSpecLabel('Օպերատիվ հիշողություն')).toBe(true);
    expect(looksLikeSpecLabel('Էկրանի անկյունագիծ')).toBe(true);
    expect(looksLikeSpecLabel('Bluetooth')).toBe(true);
  });

  it('swaps reversed rows with high confidence', () => {
    expect(shouldSwapSpecRow('48GB', 'Օպերատիվ հիշողություն')).toBe(true);
    expect(shouldSwapSpecRow('16.2 inch (41.148 cm)', 'Էկրանի անկյունագիծ')).toBe(true);
    expect(shouldSwapSpecRow('Էկրանի անկյունագիծ', '16.2 inch (41.148 cm)')).toBe(false);
  });
});

describe('normalizeProductSpecsHtml semantic recovery', () => {
  it('recovers Storage | Notebook to Device type | Notebook in English', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Storage', 'Notebook')));
    expect(result).toContain('class="spec-label">Device type</td><td class="spec-value">Notebook</td>');
    expect(result).not.toContain('>Storage</td><td class="spec-value">Notebook</td>');
  });

  it('recovers section-only Armenian header mispaired with Notebook', () => {
    const result = normalizeProductSpecsHtml('hy', specsTable(specRow('Հիշողություն', 'Notebook')));
    expect(result).toContain('class="spec-label">Սարքի տեսակ</td><td class="spec-value">Notebook</td>');
    expect(result).not.toContain('>Հիշողություն</td><td class="spec-value">Notebook</td>');
  });

  it('maps Storage | SSD to Storage type | SSD', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Storage', 'SSD')));
    expect(result).toContain('class="spec-label">Storage type</td><td class="spec-value">SSD</td>');
  });

  it('maps Storage | 1 TB to Storage | 1 TB', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Storage', '1 TB')));
    expect(result).toContain('class="spec-label">Storage</td><td class="spec-value">1 TB</td>');
  });

  it('maps Type | Notebook to Device type | Notebook', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Type', 'Notebook')));
    expect(result).toContain('class="spec-label">Device type</td><td class="spec-value">Notebook</td>');
  });

  it('maps Type | SSD to Storage type | SSD', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Type', 'SSD')));
    expect(result).toContain('class="spec-label">Storage type</td><td class="spec-value">SSD</td>');
  });

  it('maps Memory | 48GB to RAM | 48GB', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Memory', '48GB')));
    expect(result).toContain('class="spec-label">RAM</td><td class="spec-value">48GB</td>');
  });

  it('keeps macOS under Operating system', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Operating system', 'macOS')));
    expect(result).toContain('class="spec-label">Operating system</td><td class="spec-value">macOS</td>');
  });

  it('preserves unknown low-confidence rows without random swapping', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Special feature', 'Dual speakers')));
    expect(result).toContain('class="spec-label">Special feature</td><td class="spec-value">Dual speakers</td>');
  });
});

describe('normalizeProductSpecsHtml', () => {
  it('repairs swapped laptop specification rows in Armenian', () => {
    const result = normalizeProductSpecsHtml('hy', LAPTOP_SPECS_HTML);

    expect(result).toContain('class="spec-label">Էկրանի անկյունագիծ</td><td class="spec-value">16.2 inch (41.148 cm)</td>');
    expect(result).toContain('class="spec-label">Ներկառուցված հիշողություն</td><td class="spec-value">1 TB</td>');
    expect(result).toContain('class="spec-label">Օպերատիվ հիշողություն</td><td class="spec-value">48GB</td>');
    expect(result).toContain('class="spec-label">Կոշտ սկավառակի տեսակ</td><td class="spec-value">SSD</td>');
    expect(result).toContain('class="spec-label">Սարքի տեսակ</td><td class="spec-value">Notebook</td>');
    expect(result).toContain('class="spec-label">Օպերացիոն համակարգ</td><td class="spec-value">macOS</td>');
    expect(result).toContain('class="spec-label">Bluetooth</td><td class="spec-value">Այո</td>');
    expect(result).toContain('class="spec-label">WiFi</td><td class="spec-value">Այո</td>');
    expect(result).toContain('class="spec-label">Գույն</td><td class="spec-value">Space Black</td>');
    expect(result).toContain('class="spec-label">Վեբ տեսախցիկ</td><td class="spec-value">Այո</td>');
    expect(result).not.toContain('macOS</p>');
    expect(result).not.toContain('>Հիշողություն</td><td class="spec-value">Notebook</td>');
  });

  it('removes duplicate section headers and duplicate rows', () => {
    const html =
      '<table class="product-specs"><tbody>' +
      '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-title">Screen</span></td></tr>' +
      specRow('1640 x 2360', 'Էկրանի լուծաչափ') +
      '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-title">Screen</span></td></tr>' +
      specRow('1640 x 2360', 'Էկրանի լուծաչափ') +
      '</tbody></table>';

    const result = normalizeProductSpecsHtml('hy', html);
    const sectionMatches = result.match(/specs-section--screen/g) ?? [];

    expect(sectionMatches).toHaveLength(1);
    expect(result.match(/spec-row/g)?.length).toBe(1);
  });

  it('does not render empty spec rows', () => {
    const html = specsTable(specRow('Առկա է խանութներում', 'Երաշխիք'));
    const result = normalizeProductSpecsHtml('hy', html);
    expect(result).not.toContain('spec-row');
  });

  it('maps swapped 256GB operativ import row to built-in storage', () => {
    const result = normalizeProductSpecsHtml(
      'hy',
      specsTable(specRow('256GB', 'Օպերատիվ հիշողություն')),
    );
    expect(result).toContain('class="spec-label">Ներկառուցված հիշողություն</td><td class="spec-value">256GB</td>');
    expect(result).not.toContain('>Օպերատիվ հիշողություն</td><td class="spec-value">256GB</td>');
  });

  it('maps Screen section title with inch value to screen diagonal', () => {
    const result = normalizeProductSpecsHtml('hy', specsTable(specRow('Էկրան', '16.2 inch')));
    expect(result).toContain('class="spec-label">Էկրանի անկյունագիծ</td><td class="spec-value">16.2 inch</td>');
  });

  it('maps Հիշողություն | 1 TB to built-in storage in Armenian', () => {
    const result = normalizeProductSpecsHtml('hy', specsTable(specRow('Հիշողություն', '1 TB')));
    expect(result).toContain('class="spec-label">Ներկառուցված հիշողություն</td><td class="spec-value">1 TB</td>');
  });

  it('maps processor GPU row correctly in English', () => {
    const html = specsTable(
      specRow('Պրոцեսor', '2x4.26 GHz + 4xX.X GHz Apple GPU (5-core graphics)'),
    );
    const result = normalizeProductSpecsHtml('en', html);
    expect(result).toContain('class="spec-label">Processor</td><td class="spec-value">2x4.26 GHz');
    expect(result).not.toContain('Screen resolution</td><td class="spec-value">2x4.26 GHz');
  });

  it('maps warranty months and macOS correctly from swapped import rows', () => {
    const html = specsTable(
      specRow('12 months', 'Մոդել') + specRow('macOS', 'Օպeracion hamakarg'),
    );
    const fixedHtml = html.replace('Օպeracion hamakarg', 'Օպերացիոն համակարգ');
    const result = normalizeProductSpecsHtml('en', fixedHtml);
    expect(result).toContain('Warranty</td><td class="spec-value">12 months</td>');
    expect(result).toContain('Operating system</td><td class="spec-value">macOS</td>');
  });

  it('removes empty groups from final rebuilt HTML', () => {
    const html =
      '<table class="product-specs"><tbody>' +
      '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-title">Screen</span></td></tr>' +
      '<tr class="specs-section specs-section--memory"><td colspan="2"><span class="specs-section-title">Memory</span></td></tr>' +
      specRow('48GB', 'Օպerativ hishoxutyun') +
      '</tbody></table>';
    const fixed = html.replace('Օպerativ hishoxutyun', 'Օպերատիվ հիշողություն');
    const result = normalizeProductSpecsHtml('en', fixed);
    expect(result.match(/specs-section--screen/g)).toBeNull();
    expect(result).toContain('RAM</td><td class="spec-value">48GB</td>');
  });

  it('does not render section titles as spec labels in final HTML', () => {
    const result = normalizeProductSpecsHtml('en', LAPTOP_SPECS_HTML);
    expect(result).not.toMatch(/class="spec-label">Memory<\/td>/);
    expect(result).not.toMatch(/class="spec-label">Screen<\/td>/);
    expect(result).not.toMatch(/class="spec-label">Other<\/td>/);
  });
});

describe('normalizeProductSpecSections', () => {
  it('returns normalized label/value structure', () => {
    const items = parseProductSpecsTableItems(LAPTOP_SPECS_HTML);
    const sections = normalizeProductSpecSections(items, 'hy');
    const rows = sections.flatMap((section) => section.rows);

    expect(rows.some((row) => row.label === 'Օպերատիվ հիշողություն' && row.value === '48GB')).toBe(true);
    expect(rows.some((row) => row.label === '48GB')).toBe(false);
    expect(rows.some((row) => row.label === 'Սարքի տեսակ' && row.value === 'Notebook')).toBe(true);
  });
});

describe('normalizeProductSpecsHtml localization', () => {
  it('renders Armenian spec labels in Armenian locale', () => {
    const result = normalizeProductSpecsHtml('hy', specsTable(specRow('Սարքի տեսակ', 'Notebook')));
    expect(result).toContain('class="spec-label">Սարքի տեսակ</td><td class="spec-value">Notebook</td>');
  });

  it('renders English spec labels in English locale', () => {
    const result = normalizeProductSpecsHtml('en', specsTable(specRow('Սարքի տեսակ', 'Notebook')));
    expect(result).toContain('class="spec-label">Device type</td><td class="spec-value">Notebook</td>');
  });

  it('renders Russian spec labels in Russian locale', () => {
    const result = normalizeProductSpecsHtml('ru', specsTable(specRow('Սարքի տեսակ', 'Notebook')));
    expect(result).toContain('class="spec-label">Тип устройства</td><td class="spec-value">Notebook</td>');
  });

  it('localizes operating system label in English and Russian', () => {
    const html = specsTable(specRow('Օպերացիոն համակարգ', 'macOS'));
    expect(normalizeProductSpecsHtml('en', html)).toContain(
      'class="spec-label">Operating system</td><td class="spec-value">macOS</td>',
    );
    expect(normalizeProductSpecsHtml('ru', html)).toContain(
      'class="spec-label">Операционная система</td><td class="spec-value">macOS</td>',
    );
  });

  it('localizes storage and RAM labels in English and Russian', () => {
    const storageHtml = specsTable(specRow('Ներկառուցված հիշողություն', '1 TB'));
    expect(normalizeProductSpecsHtml('en', storageHtml)).toContain(
      'class="spec-label">Storage</td><td class="spec-value">1 TB</td>',
    );
    expect(normalizeProductSpecsHtml('ru', storageHtml)).toContain(
      'class="spec-label">Встроенная память</td><td class="spec-value">1 TB</td>',
    );

    const ramHtml = specsTable(specRow('Օպերատիվ հիշողություն', '48GB'));
    expect(normalizeProductSpecsHtml('en', ramHtml)).toContain(
      'class="spec-label">RAM</td><td class="spec-value">48GB</td>',
    );
    expect(normalizeProductSpecsHtml('ru', ramHtml)).toContain(
      'class="spec-label">Оперативная память</td><td class="spec-value">48GB</td>',
    );
  });

  it('translates yes/no values by locale and keeps technical values unchanged', () => {
    const html = specsTable(
      specRow('Bluetooth', 'Այո') +
        specRow('Օպերացիոն համակարգ', 'macOS') +
        specRow('Կոշտ սկավառակի տեսակ', 'SSD') +
        specRow('Օպերատիվ հիշողություն', '48GB') +
        specRow('Պրոцեսor', 'Apple M5 Pro'),
    );

    const en = normalizeProductSpecsHtml('en', html.replace('Պրոцեսor', 'Պրոցեսոր'));
    expect(en).toContain('class="spec-value">Yes</td>');
    expect(en).toContain('class="spec-value">macOS</td>');
    expect(en).toContain('class="spec-value">SSD</td>');
    expect(en).toContain('class="spec-value">48GB</td>');
    expect(en).toContain('class="spec-value">Apple M5 Pro</td>');

    const ru = normalizeProductSpecsHtml('ru', html.replace('Պրոцեսor', 'Պրոցեսոր'));
    expect(ru).toContain('class="spec-value">Да</td>');
  });

  it('localizes section titles and avoids Armenian labels in English/Russian output', () => {
    const en = normalizeProductSpecsHtml('en', LAPTOP_SPECS_HTML);
    expect(en).toContain('specs-section-title">Display</span>');
    expect(en).toContain('specs-section-title">Memory</span>');
    expect(en).not.toMatch(/class="spec-label">[\u0531-\u0587]/);

    const ru = normalizeProductSpecsHtml('ru', LAPTOP_SPECS_HTML);
    expect(ru).toContain('specs-section-title">Экран</span>');
    expect(ru).not.toMatch(/class="spec-label">[\u0531-\u0587]/);
  });

  it('does not render empty groups or section titles as spec labels after localization', () => {
    const en = normalizeProductSpecsHtml('en', LAPTOP_SPECS_HTML);
    expect(en).not.toMatch(/class="spec-label">Memory<\/td>/);
    expect(en.match(/specs-section--\w+/g)?.every((slug) => {
      const sectionBody = en.split(slug)[1] ?? '';
      return sectionBody.includes('spec-row');
    })).toBe(true);
  });
});

describe('getProductDescriptionHtml fallback', () => {
  it('falls back to Armenian source description for English locale', async () => {
    const { getProductDescriptionHtml } = await import('./get-product-description-html');
    const armenian = specsTable(specRow('Սարքի տեսակ', 'Notebook'));
    const html = getProductDescriptionHtml('en', 'unknown-product-id', {
      description: null,
      sourceDescription: armenian,
    });
    expect(html).toContain('Device type</td><td class="spec-value">Notebook</td>');
  });

  it('keeps Marco th/td spec tables instead of dropping the description', async () => {
    const { getProductDescriptionHtml } = await import('./get-product-description-html');
    const marcoHtml =
      '<table class="product-specs"><tbody>' +
      '<tr><th>Արտադրող երկիր</th><td>Չինաստան</td></tr>' +
      '<tr><th>Գույն</th><td>Սպիտակ</td></tr>' +
      '</tbody></table>';
    const html = getProductDescriptionHtml('en', 'marco-hisense', {
      description: marcoHtml,
      sourceDescription: marcoHtml,
    });
    expect(html.trim().length).toBeGreaterThan(0);
    expect(html).toContain('Չինաստան');
    expect(html).toContain('spec-value');
  });
});

describe('translateProductSpecsHtml', () => {
  it('removes standalone iOS status and repairs mispaired spec rows for English', async () => {
    const { translateProductSpecsHtml } = await import('./translate-product-specs-html');
    const html =
      '<p class="product-status">iOS</p>' +
      '<table class="product-specs"><tbody>' +
      '<tr class="specs-section specs-section--general"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Ընդհանուր բնութագրեր</span></td></tr>' +
      specRow('Առկա է խանութներում', 'Երաշխիք') +
      specRow('12 months', 'Հայտարարության տարին') +
      specRow('2026', 'Օպերացիոն համակարգ') +
      '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Էկրան</span></td></tr>' +
      specRow('Էկրանի կետայնություն', '1640 x 2360') +
      '</tbody></table>';

    const result = translateProductSpecsHtml('en', html);

    expect(result).not.toContain('product-status');
    expect(result).not.toContain('iOS');
    expect(result).toContain('General');
    expect(result).toContain('Warranty');
    expect(result).toContain('12 months');
    expect(result).toContain('Announcement year');
    expect(result).toContain('2026');
    expect(result).toContain('Screen resolution');
    expect(result).toContain('1640 x 2360');
    expect(result).not.toContain('Երաշխիք');
    expect(result).not.toContain('Հայտարարության տարին');
  });
});
