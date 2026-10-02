/** Max bytes per aparik document (keeps multipart under typical serverless body limits). */
export const MAX_APARIK_DOCUMENT_BYTES = 1024 * 1024;

export const MAX_APARIK_DOCUMENTS = 6;

export const APARIK_ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
] as const;

export type AparikAllowedDocumentMime =
  (typeof APARIK_ALLOWED_DOCUMENT_MIME_TYPES)[number];
