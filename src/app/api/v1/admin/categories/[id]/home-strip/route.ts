import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from '@/lib/services/admin.service';
import { invalidateAdminReferenceServerCache } from '@/lib/admin/admin-reference-server-cache';
import { runApiRoute } from '@/lib/errors/run-api-route';

/**
 * PATCH /api/v1/admin/categories/[id]/home-strip
 * Toggle category visibility on the home page strip (star control).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const result = await adminService.toggleHomeStrip(id);
    await invalidateAdminReferenceServerCache('categories');
    return NextResponse.json(result);
  });
}
