import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from '@/lib/services/admin.service';
import { invalidateAdminReferenceServerCache } from '@/lib/admin/admin-reference-server-cache';
import { runApiRoute } from '@/lib/errors/run-api-route';

/**
 * PATCH /api/v1/admin/categories/reorder
 * Reorder sibling categories by position
 */
export async function PATCH(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const result = await adminService.reorderCategories(body);
    await invalidateAdminReferenceServerCache('categories');
    return NextResponse.json(result);
  });
}
