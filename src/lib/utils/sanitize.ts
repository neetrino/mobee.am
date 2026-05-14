import sanitizeHtmlLib from 'sanitize-html';

/** Mirrors prior DOMPurify allowlist for product / legal rich text fragments. */
const SANITIZE_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'span',
  'div',
] as const;

const SANITIZE_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class'],
  a: ['href', 'target', 'rel'],
};

/**
 * Sanitize HTML string to prevent XSS. Use before dangerouslySetInnerHTML.
 * Uses `sanitize-html` (no JSDOM) so Next.js SSR does not touch jsdom’s default stylesheet path.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  return sanitizeHtmlLib(html, {
    allowedTags: [...SANITIZE_ALLOWED_TAGS],
    allowedAttributes: SANITIZE_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
  });
}
