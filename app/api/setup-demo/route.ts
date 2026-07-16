import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Demo setup has been disabled as per user request to not auto-create accounts.
  return NextResponse.json(
    { error: "Demo setup is disabled in this environment." },
    { status: 403 }
  );
}
