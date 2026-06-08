import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LANGUAGE } from '@/lib/language';
import { getCachedHomeCategoryStrip } from '@/lib/services/categories-home-strip-cached';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || DEFAULT_LANGUAGE;

    const { result, cacheStatus } = await getCachedHomeCategoryStrip(lang);

    return NextResponse.json(result, {
      headers: { 'X-Cache': cacheStatus },
    });
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };
    console.error('❌ [HOME CATEGORY STRIP] Error:', error);
    return NextResponse.json(
      {
        type: err.type || 'https://api.shop.am/problems/internal-error',
        title: err.title || 'Internal Server Error',
        status: err.status || 500,
        detail: err.detail || err.message || 'An error occurred',
        instance: req.url || '',
      },
      { status: err.status || 500 },
    );
  }
}
