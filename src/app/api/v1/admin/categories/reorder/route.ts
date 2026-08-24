import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from '@/lib/services/admin.service';
import { invalidateAdminReferenceServerCache } from '@/lib/admin/admin-reference-server-cache';

/**
 * PATCH /api/v1/admin/categories/reorder
 * Reorder sibling categories by position
 */
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const result = await adminService.reorderCategories(body);
    await invalidateAdminReferenceServerCache('categories');
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };
    console.error('❌ [ADMIN CATEGORIES] REORDER Error:', error);
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
