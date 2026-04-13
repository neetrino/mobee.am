import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { db } from "@white-shop/db";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/admin/messages
 * Get all contact messages (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Get total count
    let total: number;
    let messages: Array<{
      id: string;
      name: string;
      email: string;
      subject: string;
      message: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    
    try {
      total = await db.contactMessage.count();
    } catch (dbError: unknown) {
      logger.error("Database count error", { error: dbError });
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      throw new Error(`Database query failed: ${errorMessage}. Make sure Prisma Client is generated and migrations are applied.`);
    }

    try {
      // Get messages
      messages = await db.contactMessage.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (dbError: unknown) {
      logger.error("Database findMany error", { error: dbError });
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      throw new Error(`Database query failed: ${errorMessage}. Make sure Prisma Client is generated and migrations are applied.`);
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    logger.error("Admin messages error", { error });
    if (error instanceof Error) {
      logger.error("Admin messages error stack", { stack: error.stack });
    }
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

/**
 * DELETE /api/v1/admin/messages
 * Delete multiple messages by IDs (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'ids' is required and must be a non-empty array",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Delete messages
    const result = await db.contactMessage.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    logger.info('Deleted messages', { count: result.count });

    return NextResponse.json({
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error: unknown) {
    logger.error("Admin messages delete error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}



