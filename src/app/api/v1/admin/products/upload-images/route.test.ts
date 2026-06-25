import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

vi.mock("@/lib/middleware/admin-api-auth", () => ({
  requireAdminApiContext: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  isR2Configured: vi.fn(),
  uploadToR2: vi.fn(),
}));

const TEST_PNG_DATA_URL = `data:image/png;base64,${Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]).toString("base64")}`;

const TEST_JPEG_DATA_URL = `data:image/jpeg;base64,${Buffer.from([
  0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00,
]).toString("base64")}`;

describe("/api/v1/admin/products/upload-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminApiContext).mockResolvedValue({
      userId: "admin-1",
      roles: ["admin"],
      source: "fallback-auth",
    });
  });

  it("returns 403 on GET when not admin", async () => {
    vi.mocked(requireAdminApiContext).mockResolvedValue(
      NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
        },
        { status: 403 },
      ),
    );
    const req = new NextRequest("http://localhost:3000/api/v1/admin/products/upload-images", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns storage health payload on GET for admin", async () => {
    vi.mocked(isR2Configured).mockReturnValue(false);
    const req = new NextRequest("http://localhost:3000/api/v1/admin/products/upload-images", {
      method: "GET",
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storage.configured).toBe(false);
    expect(body.storage.mode).toBe("inline-fallback");
  });

  it("falls back to inline urls when R2 is not configured", async () => {
    vi.mocked(isR2Configured).mockReturnValue(false);
    const req = new NextRequest("http://localhost:3000/api/v1/admin/products/upload-images", {
      method: "POST",
      body: JSON.stringify({
        images: [TEST_PNG_DATA_URL],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.urls).toEqual([TEST_PNG_DATA_URL]);
    expect(body.storage.fallback).toBe(true);
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("uploads via R2 when configured", async () => {
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(uploadToR2).mockResolvedValue("https://cdn.example.com/products/image.jpg");
    const req = new NextRequest("http://localhost:3000/api/v1/admin/products/upload-images", {
      method: "POST",
      body: JSON.stringify({
        images: [TEST_JPEG_DATA_URL],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.urls).toEqual(["https://cdn.example.com/products/image.jpg"]);
    expect(body.storage.fallback).toBe(false);
    expect(uploadToR2).toHaveBeenCalledTimes(1);
  });
});
