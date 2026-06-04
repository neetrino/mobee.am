import { describe, expect, it } from "vitest";
import { resolveAdminGateFromJwtPayload } from "@/lib/security/jwt-payload";

describe("resolveAdminGateFromJwtPayload", () => {
  it("returns legacy when roles claim is absent", () => {
    expect(resolveAdminGateFromJwtPayload({ userId: "u1" })).toBe("legacy");
  });

  it("allows admin role", () => {
    expect(
      resolveAdminGateFromJwtPayload({ userId: "u1", roles: ["admin"] })
    ).toBe("allow");
  });

  it("denies non-admin roles", () => {
    expect(
      resolveAdminGateFromJwtPayload({ userId: "u1", roles: ["customer"] })
    ).toBe("deny");
  });
});
