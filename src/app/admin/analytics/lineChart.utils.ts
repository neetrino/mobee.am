export const TREND_REVENUE_COLOR = '#2DB2FF';
export const TREND_ORDERS_COLOR = '#FBBF24';

export function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

export function formatAxisAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`;
  }
  return String(Math.round(amount));
}

export function formatPointLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('hy-AM', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function dayNumberFromIso(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10));
  return Number.isFinite(day) ? String(day) : isoDate;
}

export function xForIndex(
  index: number,
  pointCount: number,
  paddingLeft: number,
  plotWidth: number,
): number {
  const count = Math.max(pointCount, 1);
  const slotWidth = plotWidth / count;
  return paddingLeft + slotWidth * (index + 0.5);
}

export function shouldShowDayLabel(index: number, pointCount: number): boolean {
  if (pointCount <= 14) {
    return true;
  }
  if (pointCount <= 31) {
    return index % 2 === 0 || index === pointCount - 1;
  }
  const step = Math.ceil(pointCount / 12);
  return index % step === 0 || index === pointCount - 1;
}

export function defaultFormatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
