import { describe, expect, it, vi } from "vitest";
import { calculateDateRange } from "./analytics";
import { normalizeCurrencyCode } from "@/lib/contracts/admin-analytics";

describe("calculateDateRange", () => {
  it("returns full-day boundaries for day period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T10:20:30.000Z"));

    const range = calculateDateRange("day");

    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.start.getSeconds()).toBe(0);
    expect(range.start.getMilliseconds()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getSeconds()).toBe(59);
    expect(range.end.getMilliseconds()).toBe(999);
    vi.useRealTimers();
  });

  it("returns custom boundaries when explicit range is provided", () => {
    const range = calculateDateRange("custom", "2026-03-01", "2026-03-31");

    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getSeconds()).toBe(59);
    expect(range.end.getMilliseconds()).toBe(999);
  });

  it("falls back to trailing week when custom dates are missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T10:20:30.000Z"));

    const range = calculateDateRange("custom");

    const diffInMs = range.end.getTime() - range.start.getTime();
    expect(diffInMs).toBe((8 * 24 * 60 * 60 * 1000) - 1);
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    vi.useRealTimers();
  });
});

describe("normalizeCurrencyCode", () => {
  it("normalizes mixed-case currency values", () => {
    expect(normalizeCurrencyCode(" amd ")).toBe("AMD");
    expect(normalizeCurrencyCode("usd")).toBe("USD");
  });

  it("falls back to AMD for invalid values", () => {
    expect(normalizeCurrencyCode("")).toBe("AMD");
    expect(normalizeCurrencyCode("12")).toBe("AMD");
    expect(normalizeCurrencyCode(null)).toBe("AMD");
    expect(normalizeCurrencyCode(undefined)).toBe("AMD");
  });
});
