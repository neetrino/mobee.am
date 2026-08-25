import { describe, expect, it } from "vitest";
import { isMemoryCacheAllowed } from "./cache-memory";

describe("catalog/security cache policy helpers", () => {
  it("forbids in-memory cache as a Redis replacement in production", () => {
    expect(isMemoryCacheAllowed("production")).toBe(false);
    expect(isMemoryCacheAllowed("development")).toBe(true);
    expect(isMemoryCacheAllowed("test")).toBe(true);
  });
});
