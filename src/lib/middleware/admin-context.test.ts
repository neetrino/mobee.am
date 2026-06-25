import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  ADMIN_TRUSTED_HEADERS,
  ADMIN_TRUSTED_HEADER_VALUES,
} from "@/lib/middleware/admin-context.constants";
import { parseTrustedAdminHeaders } from "@/lib/middleware/admin-context";
import {
  setTrustedAdminHeaders,
  stripTrustedAdminHeaders,
} from "@/lib/middleware/admin-context-headers";

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/stats", { headers });
}

describe("admin trusted context headers", () => {
  it("parses valid trusted admin headers", () => {
    const request = buildRequest({
      [ADMIN_TRUSTED_HEADERS.AUTHENTICATED]: ADMIN_TRUSTED_HEADER_VALUES.AUTHENTICATED,
      [ADMIN_TRUSTED_HEADERS.USER_ID]: "admin-1",
      [ADMIN_TRUSTED_HEADERS.ROLES]: "admin,customer",
    });

    expect(parseTrustedAdminHeaders(request)).toEqual({
      userId: "admin-1",
      roles: ["admin", "customer"],
    });
  });

  it("rejects spoofed headers without admin role", () => {
    const request = buildRequest({
      [ADMIN_TRUSTED_HEADERS.AUTHENTICATED]: ADMIN_TRUSTED_HEADER_VALUES.AUTHENTICATED,
      [ADMIN_TRUSTED_HEADERS.USER_ID]: "fake-user",
      [ADMIN_TRUSTED_HEADERS.ROLES]: "customer",
    });

    expect(parseTrustedAdminHeaders(request)).toBeNull();
  });

  it("strips trusted headers before middleware re-sets them", () => {
    const headers = new Headers({
      [ADMIN_TRUSTED_HEADERS.AUTHENTICATED]: "1",
      [ADMIN_TRUSTED_HEADERS.USER_ID]: "fake-user",
      [ADMIN_TRUSTED_HEADERS.ROLES]: "admin",
      "x-test": "keep",
    });

    const stripped = stripTrustedAdminHeaders(headers);
    expect(stripped.get(ADMIN_TRUSTED_HEADERS.USER_ID)).toBeNull();
    expect(stripped.get("x-test")).toBe("keep");

    setTrustedAdminHeaders(stripped, {
      userId: "verified-admin",
      roles: ["admin"],
    });

    expect(stripped.get(ADMIN_TRUSTED_HEADERS.USER_ID)).toBe("verified-admin");
    expect(stripped.get(ADMIN_TRUSTED_HEADERS.ROLES)).toBe("admin");
  });
});
