import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const snap = await adminDb.collection("orphanedStudents").orderBy("orphanedAt", "desc").get();
    const students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ students });
  } catch {
    return NextResponse.json({ error: "Failed to load orphaned students." }, { status: 500 });
  }
}
