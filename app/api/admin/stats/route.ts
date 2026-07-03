import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  try {
    /* Parallelise all top-level queries, then parallelise student counts per teacher */
    const [teachersSnap, parentsSnap, orphanedStudentsSnap, orphanedTeachersSnap] = await Promise.all([
      adminDb.collection("teachers").get(),
      adminDb.collection("parents").get(),
      adminDb.collection("orphanedStudents").get(),
      adminDb.collection("orphanedTeachers").get(),
    ]);

    const studentCounts = await Promise.all(
      teachersSnap.docs.map((t) =>
        adminDb.collection("teachers").doc(t.id).collection("students").count().get()
          .then((r) => r.data().count)
      )
    );
    const totalStudents = studentCounts.reduce((a, b) => a + b, 0);

    /* Fetch admin name from the admins collection using the session email */
    const adminEmail = session.adminEmail;
    let adminName = "Admin";
    if (adminEmail) {
      const adminSnap = await adminDb.collection("admins").where("email", "==", adminEmail).limit(1).get();
      if (!adminSnap.empty) adminName = adminSnap.docs[0].data().name;
    }

    return NextResponse.json({
      stats: {
        totalTeachers: teachersSnap.size,
        totalParents: parentsSnap.size,
        totalStudents,
        orphanedStudents: orphanedStudentsSnap.size,
        orphanedTeachers: orphanedTeachersSnap.size,
        adminName,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
