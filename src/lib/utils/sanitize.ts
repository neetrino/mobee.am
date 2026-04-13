import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML string to prevent XSS. Use before dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}
