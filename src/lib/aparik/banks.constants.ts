export const APARIK_BANK_IDS = ['evoca', 'acba', 'ameria', 'vtb'] as const;

export type AparikBankId = (typeof APARIK_BANK_IDS)[number];

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
    logoSrc: '/images/aparik/banks/evoca.png',
    logoAlt: 'Evocabank',
    logoObjectFit: 'contain',
  },
  {
    id: 'acba',
    logoSrc: '/images/aparik/banks/acba.png',
    logoAlt: 'ACBA Bank',
    logoObjectFit: 'contain',
  },
  {
    id: 'ameria',
    logoSrc: '/images/aparik/banks/ameria.jpg',
    logoAlt: 'Ameriabank',
    logoObjectFit: 'cover',
  },
  {
    id: 'vtb',
    logoSrc: '/images/aparik/banks/vtb.png',
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
