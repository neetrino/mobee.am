export const APARIK_DOCUMENT_TYPE_IDS = [
  'id_passport',
  'id_social',
  'selfie',
  'other',
] as const;

export type AparikDocumentTypeId = (typeof APARIK_DOCUMENT_TYPE_IDS)[number];

export function isAparikDocumentTypeId(value: string): value is AparikDocumentTypeId {
  return (APARIK_DOCUMENT_TYPE_IDS as readonly string[]).includes(value);
}
