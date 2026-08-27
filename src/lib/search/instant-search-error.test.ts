import { describe, expect, it } from "vitest";
import { instantSearchErrorMessage } from "./instant-search-error";

describe("instantSearchErrorMessage", () => {
  it("prefers problem+json detail", () => {
    expect(
      instantSearchErrorMessage(
        { detail: "The service is temporarily unavailable.", status: 503 },
        503,
      ),
    ).toBe("The service is temporarily unavailable.");
  });

  it("falls back to status text", () => {
    expect(instantSearchErrorMessage({}, 503)).toBe("Search failed: 503");
  });
});
