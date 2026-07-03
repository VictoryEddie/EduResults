import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`admin-audit:${ip}`, 30, 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const snap = await adminDb.collection("auditLog").orderBy("timestamp", "desc").limit(100).get();
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "Failed to load audit log." }, { status: 500 });
  }
}
