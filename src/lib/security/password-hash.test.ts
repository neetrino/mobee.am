import { describe, expect, it } from "vitest";
import {
  hashPassword,
  hashPasswordBcryptLegacy,
  verifyPassword,
} from "@/lib/security/password-hash";

describe("password-hash", () => {
  it("hashes and verifies with argon2", async () => {
    const hash = await hashPassword("secret-password");
    const result = await verifyPassword("secret-password", hash);
    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(false);
  });

  it("verifies legacy bcrypt and flags rehash", async () => {
    const bcryptHash = await hashPasswordBcryptLegacy("legacy-pass");
    const ok = await verifyPassword("legacy-pass", bcryptHash);
    expect(ok.valid).toBe(true);
    expect(ok.needsRehash).toBe(true);
  });
});
