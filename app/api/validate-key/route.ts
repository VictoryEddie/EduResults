import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(`validate-key:${ip}`, 10, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    const { key } = await req.json();

    if (!key || typeof key !== "string" || !/^\d{6}$/.test(key)) {
      return NextResponse.json({ error: "Invalid access key format." }, { status: 400 });
    }

    const keyDoc = await adminDb.collection("accessKeys").doc(key).get();

    if (!keyDoc.exists) {
      return NextResponse.json({ error: "Access key not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
