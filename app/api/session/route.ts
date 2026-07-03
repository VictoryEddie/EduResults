import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// 24 hours in milliseconds
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`session:${ip}`, 20, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { idToken, role } = await req.json();

    if (!idToken || !role || !["teacher", "parent"].includes(role)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    console.log("Session API: Received ID token length:", idToken.length);
    console.log("Session API: Role:", role);

    // First, verify the ID token to get the UID
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log("Session API: Verified UID:", decodedToken.uid);
    } catch (verifyError: any) {
      console.error(
        "Session API: ID token verification failed:",
        verifyError.message,
      );
      return NextResponse.json(
        {
          error: "Invalid authentication token.",
          details: verifyError.message,
        },
        { status: 401 },
      );
    }

    const uid = decodedToken.uid;

    // Verify user role in Firestore
    const collectionName = role === "teacher" ? "teachers" : "parents";
    const userDoc = await adminDb.collection(collectionName).doc(uid).get();

    if (!userDoc.exists) {
      console.warn(`Session API: No ${role} profile found for UID: ${uid}`);
      return NextResponse.json(
        {
          error: `No ${role} account found.`,
          details: `Please ensure you are using the correct portal and your account exists in the ${collectionName} collection.`,
        },
        { status: 403 },
      );
    }

    // Verify the ID token and create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    console.log(
      "Session API: Session cookie created successfully, length:",
      sessionCookie.length,
    );

    const cookieName = role === "teacher" ? "teacher-token" : "parent-token";

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    });

    console.log("Session API: Cookie set successfully");

    return response;
  } catch (error: any) {
    console.error("Session API Error:", error);
    console.error("Session API Error code:", error.code);
    console.error("Session API Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to create session. Please try again.",
        details: error.message,
        code: error.code,
      },
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
