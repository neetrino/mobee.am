export const APARIK_BANK_IDS = ['evoca', 'acba', 'ameria', 'vtb'] as const;

export type AparikBankId = (typeof APARIK_BANK_IDS)[number];

/** Cloudflare R2 public base for installment bank logos. */
const APARIK_BANK_LOGO_BASE =
  'https://pub-1fb400d29b23441eab283310115c4542.r2.dev/static/aparik/banks';

export interface AparikBankOption {
  id: AparikBankId;
  logoSrc: string;
  logoAlt: string;
  /** `cover` for full-bleed brand plates (e.g. Ameria green). */
  logoObjectFit: 'contain' | 'cover';
}

export const APARIK_BANK_OPTIONS: readonly AparikBankOption[] = [
  {
    id: 'evoca',
    logoSrc: `${APARIK_BANK_LOGO_BASE}/evoca.webp`,
    logoAlt: 'Evocabank',
    logoObjectFit: 'contain',
  },
  {
    id: 'acba',
    logoSrc: `${APARIK_BANK_LOGO_BASE}/acba.webp`,
    logoAlt: 'ACBA Bank',
    logoObjectFit: 'contain',
  },
  {
    id: 'ameria',
    logoSrc: `${APARIK_BANK_LOGO_BASE}/ameria.webp`,
    logoAlt: 'Ameriabank',
    logoObjectFit: 'cover',
  },
  {
    id: 'vtb',
    logoSrc: `${APARIK_BANK_LOGO_BASE}/vtb.webp`,
    logoAlt: 'VTB Bank',
    logoObjectFit: 'contain',
  },
] as const;

export const APARIK_BANK_LABELS: Record<AparikBankId, string> = {
  evoca: 'Evocabank',
  acba: 'ACBA Bank',
  ameria: 'Ameriabank',
  vtb: 'VTB Bank',
};

export function isAparikBankId(value: string): value is AparikBankId {
  return (APARIK_BANK_IDS as readonly string[]).includes(value);
}
