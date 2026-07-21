import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!await checkRateLimit(`create-profile:${ip}`, 10, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { idToken, role, profileData } = await req.json();

    if (!idToken || !role || !["teacher", "parent"].includes(role) || !profileData) {
      return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
    }

    const { name, email, className } = profileData;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    // 1. Verify the ID token to get the user's UID securely
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Create the profile in the appropriate collection using Admin SDK
    const collectionName = role === "teacher" ? "teachers" : "parents";
    
    const cleanProfileData: any = {
      name,
      email: decodedToken.email || email, // Use verified email from token if available
      createdAt: new Date().toISOString(),
    };
    if (role === "teacher" && className) {
      cleanProfileData.className = className;
    }

    await adminDb.collection(collectionName).doc(uid).set(cleanProfileData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to create profile. Please try again." },
      { status: 500 }
    );
  }
}
