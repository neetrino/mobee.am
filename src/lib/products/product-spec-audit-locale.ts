import type { LanguageCode } from '../language';

const ARMENIAN_LETTER = /[\u0531-\u0587]/;

export function extractSpecLabelsFromHtml(html: string): string[] {
  const labels: string[] = [];
  const labelRegex = /class="spec-label">([^<]*)/g;
  let match: RegExpExecArray | null;

  while ((match = labelRegex.exec(html)) !== null) {
    const label = match[1]?.trim();
    if (label) {
      labels.push(label);
    }
  }

  return labels;
}

export function findArmenianSpecLabelsInHtml(html: string): string[] {
  return extractSpecLabelsFromHtml(html).filter((label) => ARMENIAN_LETTER.test(label));
}

export function shouldRejectArmenianSpecLabels(locale: LanguageCode): boolean {
  return locale === 'en' || locale === 'ru';
}
