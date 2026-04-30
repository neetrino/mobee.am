import { describe, expect, it } from "vitest";
import {
  detectSwipeDirection,
  getNextImageIndex,
  getPreviousImageIndex,
  zoomIn,
  zoomOut,
} from "./product-image-gallery.utils";

describe("product-image-gallery.utils", () => {
  it("wraps to first image when moving next from the last image", () => {
    expect(getNextImageIndex(2, 3)).toBe(0);
  });

  it("wraps to last image when moving previous from first image", () => {
    expect(getPreviousImageIndex(0, 3)).toBe(2);
  });

  it("returns safe index when there are no images", () => {
    expect(getNextImageIndex(4, 0)).toBe(0);
    expect(getPreviousImageIndex(4, 0)).toBe(0);
  });

  it("clamps zoom to supported min/max range", () => {
    expect(zoomIn(2.9)).toBe(3);
    expect(zoomOut(1.1)).toBe(1);
  });

  it("detects swipe direction only above movement threshold", () => {
    expect(detectSwipeDirection(20)).toBeNull();
    expect(detectSwipeDirection(50)).toBe("previous");
    expect(detectSwipeDirection(-50)).toBe("next");
  });
});
