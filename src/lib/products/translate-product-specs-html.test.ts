import { describe, expect, it } from 'vitest';
import { translateProductSpecsHtml } from './translate-product-specs-html';

describe('translateProductSpecsHtml', () => {
  it('removes standalone iOS status and repairs mispaired spec rows', () => {
    const html =
      '<p class="product-status">iOS</p>' +
      '<table class="product-specs"><tbody>' +
      '<tr class="specs-section specs-section--general"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Ընդհանուր բնութագրեր</span></td></tr>' +
      '<tr class="spec-row"><td class="spec-label">Առկա է խանութներում</td><td class="spec-value">Երաշխիք</td></tr>' +
      '<tr class="spec-row"><td class="spec-label">12 months</td><td class="spec-value">Հայտարարության տարին</td></tr>' +
      '<tr class="spec-row"><td class="spec-label">2026</td><td class="spec-value">Օպերացիոն համակարգ</td></tr>' +
      '<tr class="specs-section specs-section--screen"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">Էկրան</span></td></tr>' +
      '<tr class="spec-row"><td class="spec-label">Էկրանի կետայնություն</td><td class="spec-value">1640 x 2360</td></tr>' +
      '</tbody></table>';

    const result = translateProductSpecsHtml('en', html);

    expect(result).not.toContain('product-status');
    expect(result).not.toContain('iOS');
    expect(result).toContain('General characteristics');
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
