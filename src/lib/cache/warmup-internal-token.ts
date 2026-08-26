/** Symbol-keyed global so the token is a singleton across bundled module copies. */
const WARMUP_TOKEN_KEY = Symbol.for("mobee.cache.warmup.internal-token");

const WARMUP_TOKEN_BYTE_LENGTH = 32;

function createRandomHexToken(): string {
  const bytes = new Uint8Array(WARMUP_TOKEN_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type GlobalWithWarmupToken = typeof globalThis & {
  [WARMUP_TOKEN_KEY]?: string;
};

export function getWarmupInternalToken(): string {
  const globalScope = globalThis as GlobalWithWarmupToken;
  let token = globalScope[WARMUP_TOKEN_KEY];
  if (!token) {
    token = createRandomHexToken();
    globalScope[WARMUP_TOKEN_KEY] = token;
  }
  return token;
}

export const WARMUP_INTERNAL_TOKEN_HEADER = "x-warmup-token";
