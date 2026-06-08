import { describe, expect, it } from "vitest";
import { validateImageBuffer } from "@/lib/security/image-magic-bytes";

describe("validateImageBuffer", () => {
  it("accepts PNG magic bytes with image/png", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(validateImageBuffer(png, "image/png")).toBe(true);
  });

  it("rejects mismatched declared MIME", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(validateImageBuffer(png, "image/jpeg")).toBe(false);
  });
});
