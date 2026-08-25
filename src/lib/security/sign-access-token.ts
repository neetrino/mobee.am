import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { getJwtExpiresIn, requireJwtSecret } from "@/config/env";
import { JWT_ALGORITHM } from "@/lib/security/jwt.constants";

const DEFAULT_JWT_EXPIRES_IN = "7d" as const;

function resolveJwtExpiresIn(): SignOptions["expiresIn"] {
  const fromEnv = getJwtExpiresIn();
  if (!fromEnv) {
    return DEFAULT_JWT_EXPIRES_IN;
  }

  return fromEnv as SignOptions["expiresIn"];
}

/**
 * Issue access JWT with user id and roles (backward compatible: extra claim only).
 */
export function signAccessToken(userId: string, roles: string[]): string {
  const secret = requireJwtSecret();
  const signOptions: SignOptions = {
    expiresIn: resolveJwtExpiresIn(),
    algorithm: JWT_ALGORITHM,
  };

  return jwt.sign({ userId, roles }, secret, signOptions);
}
