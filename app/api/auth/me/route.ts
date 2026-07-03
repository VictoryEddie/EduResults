import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  console.log("=== /api/auth/me endpoint hit ===");
  try {
    const teacherToken = req.cookies.get("teacher-token")?.value;
    const parentToken = req.cookies.get("parent-token")?.value;
    const token = teacherToken || parentToken;

    console.log("teacher-token present:", !!teacherToken);
    console.log("parent-token present:", !!parentToken);

    if (!token) {
      console.log("No session token found");
      return NextResponse.json({ error: "No session found." }, { status: 401 });
    }

    // 1. Verify the session cookie
    console.log("Verifying session token...");
    const decodedToken = await adminAuth.verifySessionCookie(token);
    const uid = decodedToken.uid;
    const role = teacherToken ? "teacher" : "parent";

    console.log("Token verified! UID:", uid, "Role:", role);

    // 2. Fetch the profile from the correct collection
    const collectionName = role === "teacher" ? "teachers" : "parents";
    console.log(
      "Fetching profile from collection:",
      collectionName,
      "for UID:",
      uid,
    );
    const userDoc = await adminDb.collection(collectionName).doc(uid).get();

    console.log("Profile document exists?", userDoc.exists);

    if (!userDoc.exists) {
      console.log("Profile not found in Firestore");
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 },
      );
    }

    const userData = userDoc.data();
    console.log("Profile data fetched:", userData);

    return NextResponse.json({
      uid,
      email: decodedToken.email || userData?.email || null,
      name: userData?.name || (role === "teacher" ? "Teacher" : "Parent"),
      role,
      className:
        userData?.className || (role === "teacher" ? "Unassigned" : undefined),
    });
  } catch (error: any) {
    console.error("Auth Me API Error:", error);
    console.error("Error details:", error.message, error.code);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
