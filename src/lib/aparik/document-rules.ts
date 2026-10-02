import type { AparikDocumentTypeId } from '@/lib/aparik/document-types.constants';

/**
 * Installment document rules (OR):
 * 1) ID card (both sides) + selfie with ID
 * 2) Passport pages + social card + selfie with passport
 * Artsakh residence certificate → optional "other" slot
 *
 * Shared UI tiles: ID and passport use the same slot (`id_passport`).
 * Valid minimum for either path: `id_passport` + `selfie`.
 * `id_social` is needed for path 2 but optional for path 1.
 * `other` is always optional.
 */
export function hasValidAparikDocumentSet(
  types: ReadonlyArray<AparikDocumentTypeId>,
): boolean {
  const uploaded = new Set(types);
  return uploaded.has('id_passport') && uploaded.has('selfie');
}
