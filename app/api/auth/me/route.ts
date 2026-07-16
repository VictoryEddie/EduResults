import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const teacherToken = req.cookies.get("teacher-token")?.value;
    const parentToken = req.cookies.get("parent-token")?.value;
    const token = teacherToken || parentToken;

    if (!token) {
      return NextResponse.json({ error: "No session found." }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token);
    const uid = decodedToken.uid;
    const role = teacherToken ? "teacher" : "parent";

    const collectionName = role === "teacher" ? "teachers" : "parents";
    const userDoc = await adminDb.collection(collectionName).doc(uid).get();

    if (!userDoc.exists) {
      const response = NextResponse.json(
        { error: "Profile not found." },
        { status: 404 },
      );
      response.cookies.set("teacher-token", "", { maxAge: 0, path: "/" });
      response.cookies.set("parent-token", "", { maxAge: 0, path: "/" });
      return response;
    }

    const userData = userDoc.data();

    return NextResponse.json({
      uid,
      email: decodedToken.email || userData?.email || null,
      name: userData?.name || (role === "teacher" ? "Teacher" : "Parent"),
      role,
      className:
        userData?.className || (role === "teacher" ? "Unassigned" : undefined),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
