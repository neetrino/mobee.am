import * as argon2 from "argon2";
import * as bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export interface PasswordVerifyResult {
  valid: boolean;
  needsRehash: boolean;
}

function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2");
}

/**
 * Hash a new password with argon2id (OWASP recommended).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Verify password against argon2 or legacy bcrypt hash.
 * Legacy bcrypt hashes are flagged for transparent rehash on next successful login.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<PasswordVerifyResult> {
  if (isArgon2Hash(storedHash)) {
    try {
      const valid = await argon2.verify(storedHash, password);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  try {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: valid };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

/** Legacy helper for seed scripts that still use bcrypt directly. */
export async function hashPasswordBcryptLegacy(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
