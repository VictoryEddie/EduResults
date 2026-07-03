import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`admin-login:${ip}`, 5, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    /* Rate limit by email too — prevents distributed brute force */
    if (!checkRateLimit(`admin-login-email:${email.toLowerCase()}`, 5, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    const snap = await adminDb.collection("admins")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    /* Use a generic error for both wrong email and wrong password
       to prevent user enumeration attacks */
    const genericError = "Invalid email or password.";

    if (snap.empty) {
      /* Log failed login attempt (email not found) */
      await adminDb.collection("auditLog").add({
        action: "admin_login_failed",
        email: email.toLowerCase(),
        reason: "User not found",
        ip,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    const adminData = snap.docs[0].data();
    const passwordMatch = await bcrypt.compare(password, adminData.password);
    if (!passwordMatch) {
      /* Log failed login attempt (wrong password) */
      await adminDb.collection("auditLog").add({
        action: "admin_login_failed",
        email: email.toLowerCase(),
        reason: "Invalid password",
        ip,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    /* Use a cryptographically random token — not a predictable value */
    const secureToken = randomBytes(32).toString("hex");

    /* Store the session in Firestore with an expiration time */
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 10); // 10 hour session

    await adminDb.collection("adminSessions").doc(secureToken).set({
      adminEmail: email.toLowerCase(),
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      ip,
    });

    await adminDb.collection("auditLog").add({
      action: "admin_login",
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
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
