import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`create-profile:${ip}`, 10, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { idToken, role, profileData } = await req.json();

    if (!idToken || !role || !["teacher", "parent"].includes(role) || !profileData) {
      return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
    }

    // 1. Verify the ID token to get the user's UID securely
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Create the profile in the appropriate collection using Admin SDK
    const collectionName = role === "teacher" ? "teachers" : "parents";
    
    await adminDb.collection(collectionName).doc(uid).set({
      ...profileData,
      email: decodedToken.email || profileData.email, // Use verified email from token if available
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create Profile Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create profile. Please try again." },
      { status: 500 }
    );
  }
}
