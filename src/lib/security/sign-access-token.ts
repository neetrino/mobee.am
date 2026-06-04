import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { JWT_ALGORITHM } from "@/lib/security/jwt.constants";

const DEFAULT_JWT_EXPIRES_IN = "7d" as const;

function resolveJwtExpiresIn(): SignOptions["expiresIn"] {
  const fromEnv = process.env.JWT_EXPIRES_IN?.trim();
  if (!fromEnv) {
    return DEFAULT_JWT_EXPIRES_IN;
  }

  return fromEnv as SignOptions["expiresIn"];
}

/**
 * Issue access JWT with user id and roles (backward compatible: extra claim only).
 */
export function signAccessToken(userId: string, roles: string[]): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  const signOptions: SignOptions = {
    expiresIn: resolveJwtExpiresIn(),
    algorithm: JWT_ALGORITHM,
  };

  return jwt.sign({ userId, roles }, secret, signOptions);
}
