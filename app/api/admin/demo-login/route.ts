import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import crypto, { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!(await checkRateLimit(`admin-demo-login:${ip}`, 5, 60 * 60 * 1000))) {
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
    const email = process.env.DEMO_ADMIN_EMAIL;
    const password = process.env.DEMO_ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Demo admin credentials not configured on the server." },
        { status: 500 },
      );
    }

    const snap = await adminDb
      .collection("admins")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "Demo admin account not found." },
        { status: 401 },
      );
    }

    const adminData = snap.docs[0].data();
    const passwordMatch = await bcrypt.compare(password, adminData.password);
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Demo admin credentials mismatch." },
        { status: 401 },
      );
    }

    const secureToken = randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(secureToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 10);

    await adminDb.collection("adminSessions").doc(hashedToken).set({
      adminEmail: email.toLowerCase(),
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip,
      isDemo: true,
    });

    await adminDb.collection("auditLog").add({
      action: "admin_demo_login",
      email: email.toLowerCase(),
      ip,
      timestamp: new Date().toISOString(),
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin-token", secureToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
