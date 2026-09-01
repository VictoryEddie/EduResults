import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot reassign orphaned students." },
      { status: 403 }
    );
  }
  try {
    const { studentId, teacherId } = await req.json();
    if (!studentId || !teacherId) {
      return NextResponse.json({ error: "Student ID and teacher ID required." }, { status: 400 });
    }

    const orphanDoc = await adminDb.collection("orphanedStudents").doc(studentId).get();
    if (!orphanDoc.exists) return NextResponse.json({ error: "Orphaned student not found." }, { status: 404 });

    const teacherDoc = await adminDb.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    const teacherData = teacherDoc.data()!;

    const studentData = orphanDoc.data()!;
    const batch = adminDb.batch();

    // Move student to new teacher's class
    const newStudentRef = adminDb.collection("teachers").doc(teacherId).collection("students").doc(studentId);
    batch.set(newStudentRef, {
      name: studentData.name,
      parentEmail: studentData.parentEmail,
      createdAt: studentData.createdAt,
      reassignedAt: new Date().toISOString(),
      previousTeacher: studentData.originalTeacherName,
    });

    // Remove from orphaned
    batch.delete(adminDb.collection("orphanedStudents").doc(studentId));
    await batch.commit();

    // Audit log
    await adminDb.collection("auditLog").add({
      action: "student_reassigned",
      studentId,
      studentName: studentData.name,
      newTeacherId: teacherId,
      newTeacherName: teacherData.name,
      newClassName: teacherData.className,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reassign student." }, { status: 500 });
  }
}
