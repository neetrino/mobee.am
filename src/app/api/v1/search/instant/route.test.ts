import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/search/instant-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/search/instant-search")>();
  return {
    ...actual,
    findInstantSearchResults: vi.fn(),
  };
});

import { findInstantSearchResults } from "@/lib/search/instant-search";

describe("GET /api/v1/search/instant", () => {
  beforeEach(() => {
    vi.mocked(findInstantSearchResults).mockReset();
  });

  it("returns an empty success payload without querying when q is missing", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/v1/search/instant"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ results: [] });
    expect(findInstantSearchResults).not.toHaveBeenCalled();
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
  });

  it("returns listing hits for a query", async () => {
    vi.mocked(findInstantSearchResults).mockResolvedValue([
      {
        id: "p1",
        slug: "iphone",
        title: "iPhone",
        price: 100,
        hasPrice: true,
        compareAtPrice: null,
        image: null,
        category: "Phones",
      },
    ]);
    const res = await GET(
      new NextRequest("http://localhost:3000/api/v1/search/instant?q=iphone&lang=en"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(findInstantSearchResults).toHaveBeenCalledWith({
      q: "iphone",
      lang: "en",
      limit: 8,
    });
  });

  it("does not leak database messages on failure", async () => {
    vi.mocked(findInstantSearchResults).mockRejectedValue(
      Object.assign(new Error("Invalid `prisma.product.findMany()` invocation"), {
        name: "PrismaClientInitializationError",
      }),
    );
    const res = await GET(new NextRequest("http://localhost:3000/api/v1/search/instant?q=iphone"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(JSON.stringify(body)).not.toContain("prisma.product.findMany");
    expect(body.results).toBeUndefined();
    expect(body.details).toBeUndefined();
    expect(body.detail).toBe("The service is temporarily unavailable.");
  });
});
