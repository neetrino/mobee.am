import { describe, expect, it } from "vitest";
import { resolveRequestId, type HeaderGetter } from "./request-id";

function requestWithHeaders(headers: HeaderGetter): { headers: HeaderGetter } {
  return { headers };
}

describe("resolveRequestId", () => {
  it("keeps a safe incoming id", () => {
    const headers = new Headers({ "x-request-id": "abc-12345" });
    expect(resolveRequestId(requestWithHeaders(headers))).toBe("abc-12345");
  });

  it("echoes a client-injected safe id", () => {
    const headers = new Headers({ "x-request-id": "req-safe_01" });
    expect(resolveRequestId(requestWithHeaders(headers))).toBe("req-safe_01");
  });

  it("replaces a missing id", () => {
    const generated = resolveRequestId(requestWithHeaders(new Headers()));
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("replaces an injected or overlong id", () => {
    const injected = resolveRequestId(
      requestWithHeaders({
        get(name: string) {
          return name.toLowerCase() === "x-request-id" ? "abc\nInjected" : null;
        },
      }),
    );
    expect(injected).not.toContain("\n");
    expect(injected).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    const overlong = resolveRequestId(
      requestWithHeaders(new Headers({ "x-request-id": "x".repeat(200) })),
    );
    expect(overlong).toHaveLength(36);
    expect(overlong).not.toBe("x".repeat(200));
  });
});
