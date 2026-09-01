import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";
import bcrypt from "bcryptjs";

async function isAdmin(req: NextRequest) {
  return !!(await verifyAdminSession(req));
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  try {
    const snap = await adminDb.collection("teachers").get();
    const teachers = await Promise.all(
      snap.docs.map(async (doc) => {
        const teacherRef = adminDb.collection("teachers").doc(doc.id);
        const studentsSnap = await teacherRef.collection("students").get();

        return {
          id: doc.id,
          ...doc.data(),
          studentCount: studentsSnap.size,
        };
      }),
    );
    return NextResponse.json({ teachers });
  } catch {
    return NextResponse.json(
      { error: "Failed to load teachers." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot create teacher records." },
      { status: 403 }
    );
  }

  try {
    const { firstName, lastName, email, className, password } =
      await req.json();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !className ||
      !password ||
      password.length < 8
    ) {
      return NextResponse.json(
        { error: "All fields required, password at least 8 chars." },
        { status: 400 },
      );
    }

    // Check if class name is already taken
    const classCheck = await adminDb
      .collection("teachers")
      .where("className", "==", className.trim())
      .limit(1)
      .get();
    if (!classCheck.empty) {
      return NextResponse.json(
        { error: "Class name already assigned to another teacher." },
        { status: 409 },
      );
    }

    // Check if email already exists
    const emailCheck = await adminDb
      .collection("teachers")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (!emailCheck.empty) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 },
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create teacher profile in Firestore
    await adminDb.collection("teachers").doc(userRecord.uid).set({
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      className: className.trim(),
      createdAt: new Date().toISOString(),
    });

    // Audit log
    await adminDb.collection("auditLog").add({
      action: "teacher_created",
      teacherId: userRecord.uid,
      teacherName: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      className: className.trim(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create teacher error:", error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already exists in Firebase Auth." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create teacher." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot delete teacher records." },
      { status: 403 }
    );
  }

  try {
    const { teacherId } = await req.json();
    if (!teacherId)
      return NextResponse.json(
        { error: "Teacher ID required." },
        { status: 400 },
      );

    // Get teacher data before deleting
    const teacherDoc = await adminDb.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists)
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      );
    const teacherData = teacherDoc.data()!;

    // Move students to orphaned collection
    const studentsSnap = await adminDb
      .collection("teachers")
      .doc(teacherId)
      .collection("students")
      .get();
    const batch = adminDb.batch();

    for (const studentDoc of studentsSnap.docs) {
      const orphanRef = adminDb.collection("orphanedStudents").doc(studentDoc.id);
      batch.set(orphanRef, {
        ...studentDoc.data(),
        originalTeacherId: teacherId,
        originalTeacherName: teacherData.name,
        originalClassName: teacherData.className,
        orphanedAt: new Date().toISOString(),
      });
      batch.delete(studentDoc.ref);
    }

    // Move teacher to orphaned teachers (keep for historical reference)
    const orphanTeacherRef = adminDb.collection("orphanedTeachers").doc(teacherId);
    batch.set(orphanTeacherRef, {
      ...teacherData,
      orphanedAt: new Date().toISOString(),
    });

    // Delete teacher profile
    batch.delete(adminDb.collection("teachers").doc(teacherId));
    await batch.commit();

    // Revoke Firebase Auth user
    try {
      await adminAuth.deleteUser(teacherId);
    } catch (authError) {
      console.warn("Failed to delete auth user, but teacher profile removed:", authError);
    }

    // Audit log
    await adminDb.collection("auditLog").add({
      action: "teacher_removed",
      targetId: teacherId,
      targetName: teacherData.name,
      studentsOrphaned: studentsSnap.size,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove teacher." },
      { status: 500 },
    );
  }
}
