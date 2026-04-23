import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/method-not-allowed",
      title: "Method Not Allowed",
      status: 405,
      detail: `Review updates are disabled for v1 read-only scope (review '${reviewId}')`,
      instance: req.url,
    },
    { status: 405 }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/method-not-allowed",
      title: "Method Not Allowed",
      status: 405,
      detail: `Review deletion is disabled for v1 read-only scope (review '${reviewId}')`,
      instance: req.url,
    },
    { status: 405 }
  );
}

