import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`validate-class:${ip}`, 10, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { className } = await req.json();
    if (!className) return NextResponse.json({ error: "Class name is required." }, { status: 400 });

    /* Check if any teacher already has this class name */
    const snap = await adminDb.collection("teachers")
      .where("className", "==", className.trim())
      .limit(1)
      .get();

    if (!snap.empty) {
      return NextResponse.json({
        error: `Class "${className}" is already assigned to another teacher. Please use a different class name.`,
      }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
