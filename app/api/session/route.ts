import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";

// 24 hours in milliseconds
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!await checkRateLimit(`session:${ip}`, 20, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { idToken, role } = await req.json();

    if (!idToken || !role || !["teacher", "parent"].includes(role)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // First, verify the ID token to get the UID
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (verifyError: any) {
      console.error("Session API: ID token verification failed");
      return NextResponse.json(
        { error: "Invalid authentication token." },
        { status: 401 },
      );
    }

    const uid = decodedToken.uid;

    // Verify user role in Firestore
    const collectionName = role === "teacher" ? "teachers" : "parents";
    const userDoc = await adminDb.collection(collectionName).doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: `No ${role} account found. Please ensure you are using the correct portal.` },
        { status: 403 },
      );
    }

    // Verify the ID token and create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    const cookieName = role === "teacher" ? "teacher-token" : "parent-token";

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Session API Error:", error.message);
    return NextResponse.json(
      { error: "Failed to create session. Please try again." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("teacher-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("parent-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("admin-token", "", { maxAge: 0, path: "/" });
  return response;
}
