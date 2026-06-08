const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF87 = Buffer.from("GIF87a");
const GIF89 = Buffer.from("GIF89a");
const RIFF = Buffer.from("RIFF");
const WEBP = Buffer.from("WEBP");

function bufferStartsWith(buffer: Buffer, prefix: Buffer): boolean {
  if (buffer.length < prefix.length) {
    return false;
  }
  return buffer.subarray(0, prefix.length).equals(prefix);
}

/**
 * Detect image MIME from magic bytes (not from client-declared data URL).
 */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (bufferStartsWith(buffer, JPEG)) {
    return "image/jpeg";
  }
  if (bufferStartsWith(buffer, PNG)) {
    return "image/png";
  }
  if (bufferStartsWith(buffer, GIF87) || bufferStartsWith(buffer, GIF89)) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    bufferStartsWith(buffer, RIFF) &&
    buffer.subarray(8, 12).equals(WEBP)
  ) {
    return "image/webp";
  }
  return null;
}

const MIME_ALIASES: Record<string, string[]> = {
  "image/jpeg": ["image/jpeg", "image/jpg"],
  "image/png": ["image/png"],
  "image/gif": ["image/gif"],
  "image/webp": ["image/webp"],
};

function mimeMatchesDetected(declaredMime: string, detectedMime: string): boolean {
  const allowed = MIME_ALIASES[detectedMime];
  if (!allowed) {
    return declaredMime === detectedMime;
  }
  return allowed.includes(declaredMime.toLowerCase());
}

/** Returns true when buffer content matches declared MIME and is an allowed image type. */
export function validateImageBuffer(buffer: Buffer, declaredMime: string): boolean {
  const detected = detectImageMimeFromBuffer(buffer);
  if (!detected) {
    return false;
  }
  return mimeMatchesDetected(declaredMime, detected);
}
