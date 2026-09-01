import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const demoEmails = [
      "babatunde.adebayo@demo.com",
      "oluwaseun.balogun@demo.com",
      "mubarak.omoregie@demo.com",
    ];

    const counts: Record<string, number> = {};

    for (const email of demoEmails) {
      const snap = await adminDb
        .collectionGroup("students")
        .where("parentEmail", "==", email)
        .get();
      counts[email] = snap.size;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
