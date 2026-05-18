import { NextRequest, NextResponse } from "next/server";
import { validateResetToken } from "@/lib/services/password-reset.service";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token?.trim()) {
    return NextResponse.json({ valid: false });
  }

  try {
    const result = await validateResetToken(token);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ valid: false });
  }
}
