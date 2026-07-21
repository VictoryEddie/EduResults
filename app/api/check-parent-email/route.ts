import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    if (!await checkRateLimit(`check-parent-email:${ip}`, 5, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    // Single query across all students instead of N+1 teacher loop
    const studentsSnap = await adminDb.collectionGroup("students")
      .where("parentEmail", "==", email.toLowerCase())
      .limit(1)
      .get();
      
    if (studentsSnap.empty) {
      return NextResponse.json({ error: "This email is not linked to any student. Please contact your child's teacher." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
