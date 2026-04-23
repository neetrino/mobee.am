import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

vi.mock("@/lib/middleware/auth", () => ({
  authenticateToken: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  isR2Configured: vi.fn(),
  uploadToR2: vi.fn(),
}));

describe("/api/v1/admin/products/upload-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateToken).mockResolvedValue({ id: "admin-1", role: "admin" } as never);
    vi.mocked(requireAdmin).mockReturnValue(true);
  });

  it("returns storage health payload on GET", async () => {
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
        images: ["data:image/png;base64,aGVsbG8="],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.urls).toEqual(["data:image/png;base64,aGVsbG8="]);
    expect(body.storage.fallback).toBe(true);
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("uploads via R2 when configured", async () => {
    vi.mocked(isR2Configured).mockReturnValue(true);
    vi.mocked(uploadToR2).mockResolvedValue("https://cdn.example.com/products/image.jpg");
    const req = new NextRequest("http://localhost:3000/api/v1/admin/products/upload-images", {
      method: "POST",
      body: JSON.stringify({
        images: ["data:image/jpeg;base64,aGVsbG8="],
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
