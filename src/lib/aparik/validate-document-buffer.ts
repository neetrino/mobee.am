import { detectImageMimeFromBuffer } from '@/lib/security/image-magic-bytes';
import type { AparikAllowedDocumentMime } from './document-upload.constants';

const PDF_MAGIC = Buffer.from('%PDF');

function bufferStartsWith(buffer: Buffer, prefix: Buffer): boolean {
  if (buffer.length < prefix.length) {
    return false;
  }
  return buffer.subarray(0, prefix.length).equals(prefix);
}

function isPdfBuffer(buffer: Buffer): boolean {
  return bufferStartsWith(buffer, PDF_MAGIC);
}

/**
 * Validates aparik document bytes against declared MIME (jpg/png/pdf only).
 */
export function validateAparikDocumentBuffer(
  buffer: Buffer,
  declaredMime: string,
): AparikAllowedDocumentMime | null {
  const normalized = declaredMime.toLowerCase();

  if (normalized === 'application/pdf') {
    return isPdfBuffer(buffer) ? 'application/pdf' : null;
  }

  const detected = detectImageMimeFromBuffer(buffer);
  if (!detected) {
    return null;
  }

  if (detected === 'image/jpeg' && (normalized === 'image/jpeg' || normalized === 'image/jpg')) {
    return 'image/jpeg';
  }

  if (detected === 'image/png' && normalized === 'image/png') {
    return 'image/png';
  }

  return null;
}
