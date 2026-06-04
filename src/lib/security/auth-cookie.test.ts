import { describe, expect, it } from "vitest";
import {
  buildAccessTokenClearCookieHeader,
  buildAccessTokenSetCookieHeader,
  getAccessTokenMaxAgeSeconds,
} from "@/lib/security/auth-cookie";

describe("auth-cookie", () => {
  it("builds HttpOnly Set-Cookie with Max-Age", () => {
    process.env.JWT_EXPIRES_IN = "7d";
    const header = buildAccessTokenSetCookieHeader("test.jwt.token");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toMatch(/Max-Age=\d+/);
    expect(header).toContain(encodeURIComponent("test.jwt.token"));
  });

  it("clears cookie with Max-Age=0", () => {
    const header = buildAccessTokenClearCookieHeader();
    expect(header).toContain("Max-Age=0");
    expect(header).toContain("HttpOnly");
  });

  it("parses JWT_EXPIRES_IN", () => {
    process.env.JWT_EXPIRES_IN = "2h";
    expect(getAccessTokenMaxAgeSeconds()).toBe(7200);
  });
});
