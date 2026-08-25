import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@white-shop/db", () => ({
  Prisma: {},
  db: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@white-shop/db";

describe("GET /api/v1/search/instant", () => {
  it("returns an empty success payload without querying when q is missing", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/v1/search/instant"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ results: [] });
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
  });

  it("does not leak database messages on failure", async () => {
    vi.mocked(db.product.findMany).mockRejectedValue(
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
  });
});
