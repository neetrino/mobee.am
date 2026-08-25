import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { runApiRoute } from "./run-api-route";
import { REQUEST_ID_HEADER } from "./request-id";

describe("runApiRoute", () => {
  it("preserves Allow on a 405 problem response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/products", { method: "PUT" });
    const res = await runApiRoute(req, async () =>
      NextResponse.json(
        { status: 405, title: "Method Not Allowed", detail: "Use GET" },
        { status: 405, headers: { Allow: "GET, HEAD" } },
      ),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
  });

  it("does not leak arbitrary 500 details from handler throws", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/products");
    const res = await runApiRoute(req, async () => {
      throw Object.assign(new Error("secret-db-url"), { status: 500, detail: "sensitive-provider-body-XYZ" });
    });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("sensitive-provider-body-XYZ");
    expect(body.requestId).toBe(res.headers.get(REQUEST_ID_HEADER));
  });
});
