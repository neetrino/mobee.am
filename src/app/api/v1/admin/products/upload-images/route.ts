import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { logger } from "@/lib/utils/logger";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { mime, buffer };
}

/**
 * POST /api/v1/admin/products/upload-images
 * Upload images to Cloudflare R2 and return public URLs.
 * Requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.
 */
export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  logger.debug("Admin upload images: POST received", { url: req.url });

  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      logger.warn("Admin upload images: unauthorized", { userId: user?.id });
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/config-error",
          title: "Storage not configured",
          status: 503,
          detail:
            "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL in .env",
          instance: req.url,
        },
        { status: 503 }
      );
    }

    let body: { images?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Invalid JSON in request body",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'images' is required and must be a non-empty array",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const validImages: string[] = [];
    for (let i = 0; i < body.images.length; i++) {
      const image = body.images[i];
      if (typeof image !== "string" || !image.startsWith("data:image/")) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: `Image at index ${i} must be a valid base64 image (data:image/...)`,
            instance: req.url,
          },
          { status: 400 }
        );
      }
      validImages.push(image);
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const urls: string[] = [];

    for (let i = 0; i < validImages.length; i++) {
      const parsed = parseDataUrl(validImages[i]);
      if (!parsed) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: `Invalid data URL at index ${i}`,
            instance: req.url,
          },
          { status: 400 }
        );
      }
      const ext = MIME_TO_EXT[parsed.mime] ?? "jpg";
      const key = `products/${date}-${nanoid(10)}.${ext}`;
      const url = await uploadToR2(key, parsed.buffer, parsed.mime);
      if (!url) {
        logger.error("Admin upload images: R2 upload failed", { key });
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/internal-error",
            title: "Upload failed",
            status: 500,
            detail: "Failed to upload image to storage",
            instance: req.url,
          },
          { status: 500 }
        );
      }
      urls.push(url);
    }

    const totalTime = Date.now() - requestStartTime;
    logger.info("Admin upload images: done", { count: urls.length, totalTime });

    return NextResponse.json({ urls }, { status: 200 });
  } catch (error: unknown) {
    const totalTime = Date.now() - requestStartTime;
    const err = error as { message?: string; status?: number; type?: string; title?: string; detail?: string };
    logger.error("Admin upload images: POST error", {
      message: err?.message,
      status: err?.status,
      totalTime,
    });
    return NextResponse.json(
      {
        type: err?.type ?? "https://api.shop.am/problems/internal-error",
        title: err?.title ?? "Internal Server Error",
        status: err?.status ?? 500,
        detail: err?.detail ?? err?.message ?? "An error occurred",
        instance: req.url,
      },
      { status: err?.status ?? 500 }
    );
  }
}

