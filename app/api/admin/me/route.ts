import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, isDemo: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      email: session.adminEmail,
      isDemo: Boolean(session.isDemo),
    });
  } catch {
    return NextResponse.json({ authenticated: false, isDemo: false }, { status: 500 });
  }
}
