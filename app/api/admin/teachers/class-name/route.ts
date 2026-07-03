import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const { teacherId, className } = await req.json();
    if (!teacherId || !className) {
      return NextResponse.json({ error: "Teacher ID and class name required." }, { status: 400 });
    }

    /* Check class name not already taken by another teacher */
    const existing = await adminDb.collection("teachers")
      .where("className", "==", className.trim())
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0].id !== teacherId) {
      return NextResponse.json({
        error: `Class "${className}" is already assigned to another teacher.`,
      }, { status: 409 });
    }

    await adminDb.collection("teachers").doc(teacherId).update({
      className: className.trim(),
    });

    // Get teacher name first
    const teacherDoc = await adminDb.collection("teachers").doc(teacherId).get();
    const teacherData = teacherDoc.data();
    await adminDb.collection("auditLog").add({
      action: "class_name_updated",
      teacherId,
      teacherName: teacherData?.name,
      newClassName: className.trim(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update class name." }, { status: 500 });
  }
}
