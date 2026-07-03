import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(`check-parent-email:${ip}`, 10, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    // Query all teachers' students subcollections for matching parentEmail
    const teachersSnap = await adminDb.collection("teachers").get();
    let found = false;

    for (const teacherDoc of teachersSnap.docs) {
      const studentsSnap = await adminDb
        .collection("teachers")
        .doc(teacherDoc.id)
        .collection("students")
        .where("parentEmail", "==", email.toLowerCase())
        .limit(1)
        .get();

      if (!studentsSnap.empty) {
        found = true;
        break;
      }
    }

    if (!found) {
      return NextResponse.json({ error: "This email is not linked to any student. Please contact your child's teacher." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
