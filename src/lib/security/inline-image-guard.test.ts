import { describe, expect, it } from "vitest";
import { findInlineImagePath } from "./inline-image-guard";

const DATA_URI = "data:image/jpeg;base64,/9j/4AAQ";

describe("findInlineImagePath", () => {
  it("returns null for regular URLs", () => {
    expect(
      findInlineImagePath({ media: ["https://cdn.example.com/a.jpg"], variants: [{ imageUrl: "https://x/a.jpg,https://x/b.jpg" }] }),
    ).toBeNull();
  });

  it("finds a data URI in media and variant image lists", () => {
    expect(findInlineImagePath({ media: [{ url: DATA_URI }] })).toBe("$.media[0].url");
    expect(findInlineImagePath({ variants: [{ imageUrl: `https://x/a.jpg, ${DATA_URI}` }] })).toBe("$.variants[0].imageUrl");
  });

  it("ignores inline images inside rich-text HTML fields", () => {
    expect(findInlineImagePath({ descriptionHtml: `<img src="${DATA_URI}">`, basic: { descriptionHtml: DATA_URI } })).toBeNull();
  });
});
