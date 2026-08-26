import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LANGUAGE } from '@/lib/language';
import { getCachedHomeCategoryStrip } from '@/lib/services/categories-home-strip-cached';
import { runApiRoute } from '@/lib/errors/run-api-route';

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || DEFAULT_LANGUAGE;

    const { result, cacheStatus } = await getCachedHomeCategoryStrip(lang);

    return NextResponse.json(result, {
      headers: { 'X-Cache': cacheStatus },
    });
  });
}
