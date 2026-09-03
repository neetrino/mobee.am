import type { ProductDescriptionSpecRow, ProductDescriptionSpecSection } from './extract-product-description-specs';

const HERO_SECTION_SLUGS = new Set(['general', 'screen']);
const MEMORY_SECTION_SLUGS = new Set(['memory', 'processor']);
const CONNECTIVITY_SECTION_SLUGS = new Set(['connectivity']);
const ADDITIONAL_SECTION_SLUGS = new Set(['cameras', 'power', 'physical', 'warranty', 'other']);

const SUBTITLE_LABEL_KEYS = new Set([
  'product.specs.labels.model',
  'product.specs.labels.announcementYear',
]);

export interface PdpSpecLayout {
  heroRows: ProductDescriptionSpecRow[];
  heroPanelSectionSlug: string;
  heroPanelTitleKey: string;
  memoryRows: ProductDescriptionSpecRow[];
  connectivityRows: ProductDescriptionSpecRow[];
  additionalRows: ProductDescriptionSpecRow[];
  subtitle: string | null;
  hasLayout: boolean;
}

const HERO_PANEL_FALLBACKS: ReadonlyArray<{
  bucket: 'connectivityRows' | 'memoryRows' | 'additionalRows';
  sectionSlug: string;
  titleKey: string;
}> = [
  {
    bucket: 'connectivityRows',
    sectionSlug: 'connectivity',
    titleKey: 'product.specs.sections.connectivity',
  },
  {
    bucket: 'memoryRows',
    sectionSlug: 'memory',
    titleKey: 'product.specs.sections.memory',
  },
  {
    bucket: 'additionalRows',
    sectionSlug: 'other',
    titleKey: 'product.specs.sections.other',
  },
];

function collectRows(
  sections: ProductDescriptionSpecSection[],
  slugs: Set<string>,
): ProductDescriptionSpecRow[] {
  const rows: ProductDescriptionSpecRow[] = [];

  for (const section of sections) {
    if (!slugs.has(section.slug)) {
      continue;
    }
    rows.push(...section.rows);
  }

  return rows;
}

function resolveSubtitle(sections: ProductDescriptionSpecSection[]): string | null {
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.labelKey === 'product.specs.labels.model' && row.value.trim()) {
        return row.value.trim();
      }
    }
  }

  for (const section of sections) {
    for (const row of section.rows) {
      if (row.labelKey === 'product.specs.labels.announcementYear' && row.value.trim()) {
        return row.value.trim();
      }
    }
  }

  return null;
}

function withoutSubtitleRows(rows: ProductDescriptionSpecRow[]): ProductDescriptionSpecRow[] {
  return rows.filter((row) => !row.labelKey || !SUBTITLE_LABEL_KEYS.has(row.labelKey));
}

/**
 * Groups normalized spec sections into PDP desktop card buckets.
 */
export function buildPdpSpecLayout(sections: ProductDescriptionSpecSection[]): PdpSpecLayout {
  const subtitle = resolveSubtitle(sections);
  let heroRows = withoutSubtitleRows(collectRows(sections, HERO_SECTION_SLUGS));
  let memoryRows = collectRows(sections, MEMORY_SECTION_SLUGS);
  let connectivityRows = collectRows(sections, CONNECTIVITY_SECTION_SLUGS);
  let additionalRows = collectRows(sections, ADDITIONAL_SECTION_SLUGS);

  let heroPanelSectionSlug = 'general';
  let heroPanelTitleKey = 'product.specs.sections.general';

  if (heroRows.length === 0) {
    for (const fallback of HERO_PANEL_FALLBACKS) {
      const bucketRows =
        fallback.bucket === 'connectivityRows'
          ? connectivityRows
          : fallback.bucket === 'memoryRows'
            ? memoryRows
            : additionalRows;

      if (bucketRows.length === 0) {
        continue;
      }

      heroRows = bucketRows;
      heroPanelSectionSlug = 'general';
      heroPanelTitleKey = 'product.specs.sections.general';

      if (fallback.bucket === 'connectivityRows') {
        connectivityRows = [];
      } else if (fallback.bucket === 'memoryRows') {
        memoryRows = [];
      } else {
        additionalRows = [];
      }

      break;
    }
  }

  const hasLayout =
    heroRows.length > 0 ||
    memoryRows.length > 0 ||
    connectivityRows.length > 0 ||
    additionalRows.length > 0;

  return {
    heroRows,
    heroPanelSectionSlug,
    heroPanelTitleKey,
    memoryRows,
    connectivityRows,
    additionalRows,
    subtitle,
    hasLayout,
  };
}
