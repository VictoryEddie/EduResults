import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!(await checkRateLimit(`demo-login:${ip}`, 20, 60 * 60 * 1000))) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json(
      { error: "Demo login is disabled in this environment." },
      { status: 403 },
    );
  }

  try {
    const { role, email } = await req.json();

    if (role !== "teacher") {
      return NextResponse.json({ error: "Invalid role for this endpoint." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for demo login." },
        { status: 400 },
      );
    }

    // Look up the user in Firebase Auth
    const userRecord = await adminAuth.getUserByEmail(email);

    // Create a custom token that the client can use to sign in
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ customToken });
  } catch (error: any) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate demo user. Ensure the demo account exists." },
      { status: 500 },
    );
  }
}
