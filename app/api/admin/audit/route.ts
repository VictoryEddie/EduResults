import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";
import { verifySession } from "@/lib/verifySession";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await checkRateLimit(`admin-audit:${ip}`, 30, 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    
    let query = adminDb.collection("auditLog").orderBy("timestamp", "desc").limit(20);
    if (cursor) query = query.startAfter(cursor);
    
    const snap = await query.get();
    const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const nextCursor = entries.length === 20 ? entries[entries.length - 1].timestamp : null;
    
    return NextResponse.json({ entries, nextCursor });
  } catch {
    return NextResponse.json({ error: "Failed to load audit log." }, { status: 500 });
  }
}

/**
 * POST /api/admin/audit
 * Allows authenticated teachers OR admins to write audit log entries.
 * Teachers are restricted to an allowlist of actions (student-related).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await checkRateLimit(`audit-write:${ip}`, 60, 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  // Accept a teacher/parent OR admin session cookie
  const teacherSession = await verifySession(req);
  const adminSession = !teacherSession ? await verifyAdminSession(req) : null;

  if (!teacherSession && !adminSession) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ...details } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    // Teachers can only log these specific actions
    const allowedTeacherActions = [
      "student_name_updated",
      "student_email_updated",
      "student_removed",
    ];

    if (teacherSession && !allowedTeacherActions.includes(action)) {
      return NextResponse.json({ error: "Action not permitted." }, { status: 403 });
    }

    await adminDb.collection("auditLog").add({
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to write audit log." }, { status: 500 });
  }
}
