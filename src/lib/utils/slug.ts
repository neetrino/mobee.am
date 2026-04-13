const MAX_SLUG_INPUT_LENGTH = 500;

/**
 * Converts a string to a URL-safe slug without using regex on user input
 * to avoid ReDoS (polynomial regular expression) vulnerabilities.
 */
export function toSlug(input: string): string {
  const s = String(input).toLowerCase().trim();
  let out = "";
  let prevWasHyphen = false;

  for (let i = 0; i < Math.min(s.length, MAX_SLUG_INPUT_LENGTH); i++) {
    const c = s[i];
    const isAlnum =
      (c >= "a" && c <= "z") || (c >= "0" && c <= "9");

    if (isAlnum) {
      out += c;
      prevWasHyphen = false;
    } else if (!prevWasHyphen && out.length > 0) {
      out += "-";
      prevWasHyphen = true;
    }
  }

  let end = out.length;
  while (end > 0 && out[end - 1] === "-") end--;
  return out.slice(0, end);
}
