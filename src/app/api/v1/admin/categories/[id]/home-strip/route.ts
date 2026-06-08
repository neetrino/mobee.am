import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken, requireAdmin } from '@/lib/middleware/auth';
import { adminService } from '@/lib/services/admin.service';

/**
 * PATCH /api/v1/admin/categories/[id]/home-strip
 * Toggle category visibility on the home page strip (star control).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: 'https://api.shop.am/problems/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Admin access required',
          instance: req.url,
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const result = await adminService.toggleHomeStrip(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };
    console.error('❌ [ADMIN CATEGORIES] PATCH home-strip Error:', error);
    return NextResponse.json(
      {
        type: err.type || 'https://api.shop.am/problems/internal-error',
        title: err.title || 'Internal Server Error',
        status: err.status || 500,
        detail: err.detail || err.message || 'An error occurred',
        instance: req.url,
      },
      { status: err.status || 500 },
    );
  }
}
