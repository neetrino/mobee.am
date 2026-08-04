/**
 * Normalize order shippingMethod for display labels (legacy / free-text values).
 */
export function resolveOrderShippingMethodKind(
  shippingMethod: string | null | undefined,
): 'pickup' | 'delivery' | 'unknown' {
  const raw = shippingMethod?.trim() ?? '';
  if (!raw) {
    return 'unknown';
  }

  const normalized = raw.toLowerCase();

  if (normalized === 'pickup' || normalized === 'delivery') {
    return normalized;
  }

  if (
    normalized.includes('pickup') ||
    normalized.includes('самовывоз') ||
    normalized.includes('ինքնավերց') ||
    normalized.includes('խանութ') ||
    normalized.includes('xanut') ||
    normalized.includes('vercnel')
  ) {
    return 'pickup';
  }

  if (
    normalized.includes('delivery') ||
    normalized.includes('доставк') ||
    normalized.includes('առաքում')
  ) {
    return 'delivery';
  }

  return 'unknown';
}
