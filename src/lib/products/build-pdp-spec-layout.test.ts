import { describe, expect, it } from 'vitest';
import { buildPdpSpecLayout } from './build-pdp-spec-layout';
import type { ProductDescriptionSpecSection } from './extract-product-description-specs';

const LAPTOP_SECTIONS: ProductDescriptionSpecSection[] = [
  {
    slug: 'general',
    rows: [
      { label: 'Operating system', value: 'macOS', labelKey: 'product.specs.labels.operatingSystem' },
      { label: 'Device type', value: 'Notebook', labelKey: 'product.specs.labels.deviceType' },
      { label: 'Model', value: '16-inch, 2021', labelKey: 'product.specs.labels.model' },
    ],
  },
  {
    slug: 'screen',
    rows: [
      { label: 'Screen diagonal', value: '16.2 inch', labelKey: 'product.specs.labels.screenDiagonal' },
    ],
  },
  {
    slug: 'memory',
    rows: [
      { label: 'Storage', value: '1 TB', labelKey: 'product.specs.labels.builtInStorage' },
      { label: 'RAM', value: '48GB', labelKey: 'product.specs.labels.ram' },
      { label: 'Storage type', value: 'SSD', labelKey: 'product.specs.labels.storageType' },
    ],
  },
  {
    slug: 'connectivity',
    rows: [
      { label: 'Bluetooth', value: 'Yes', labelKey: 'product.specs.labels.bluetooth' },
      { label: 'WiFi', value: 'Yes', labelKey: 'product.specs.labels.wifi' },
      { label: 'Webcam', value: 'Yes', labelKey: 'product.specs.labels.webcam' },
    ],
  },
  {
    slug: 'other',
    rows: [{ label: 'Other', value: 'Microphone', labelKey: 'product.specs.labels.other' }],
  },
];

describe('buildPdpSpecLayout', () => {
  it('groups sections into desktop card buckets and uses model as subtitle', () => {
    const layout = buildPdpSpecLayout(LAPTOP_SECTIONS);

    expect(layout.subtitle).toBe('16-inch, 2021');
    expect(layout.heroRows.map((row) => row.labelKey)).toEqual([
      'product.specs.labels.operatingSystem',
      'product.specs.labels.deviceType',
      'product.specs.labels.screenDiagonal',
    ]);
    expect(layout.heroPanelSectionSlug).toBe('general');
    expect(layout.memoryRows).toHaveLength(3);
    expect(layout.connectivityRows).toHaveLength(3);
    expect(layout.additionalRows).toHaveLength(1);
    expect(layout.hasLayout).toBe(true);
  });

  it('promotes connectivity specs into hero panel when general specs are missing', () => {
    const layout = buildPdpSpecLayout([
      {
        slug: 'connectivity',
        rows: [
          { label: 'Bluetooth', value: 'Yes', labelKey: 'product.specs.labels.bluetooth' },
          { label: 'WiFi', value: 'Yes', labelKey: 'product.specs.labels.wifi' },
        ],
      },
      {
        slug: 'power',
        rows: [{ label: 'Battery', value: '30 h', labelKey: 'product.specs.labels.battery' }],
      },
    ]);

    expect(layout.heroRows).toHaveLength(2);
    expect(layout.heroPanelSectionSlug).toBe('general');
    expect(layout.connectivityRows).toHaveLength(0);
    expect(layout.additionalRows).toHaveLength(1);
    expect(layout.hasLayout).toBe(true);
  });
});
