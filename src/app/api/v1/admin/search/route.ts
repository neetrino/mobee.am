import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from '@/lib/services/admin.service';
import {
  mapAdminGlobalOrderResult,
  mapAdminGlobalProductResult,
  parseAdminGlobalSearchLimit,
} from '@/lib/search/admin-global-search';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() ?? '';
    const limit = parseAdminGlobalSearchLimit(searchParams.get('limit'));

    if (!query) {
      return NextResponse.json({
        data: { products: [], orders: [], total: 0 },
      });
    }

    const [productsResponse, ordersResponse] = await Promise.all([
      adminService.getProducts({ page: 1, limit, search: query }),
      adminService.getOrders({ page: 1, limit, search: query }),
    ]);

    const products = (productsResponse.data ?? []).map(mapAdminGlobalProductResult);
    const orders = (ordersResponse.data ?? []).map(mapAdminGlobalOrderResult);

    return NextResponse.json({
      data: {
        products,
        orders,
        total: products.length + orders.length,
      },
      meta: {
        query,
        limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        type: 'https://api.shop.am/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: error instanceof Error ? error.message : 'An error occurred',
        instance: req.url,
      },
      { status: 500 }
    );
  }
}
