import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const accessKey = searchParams.get("accessKey");
    const schoolName = searchParams.get("schoolName") || "EduResults";

    if (!accessKey) {
      return NextResponse.json(
        { error: "Please provide an accessKey parameter, e.g., /api/setup-admin?accessKey=YOUR_SECRET_KEY&schoolName=Your School Name" },
        { status: 400 }
      );
    }

    // Check if admin config already exists
    const configDoc = await adminDb.collection("adminConfig").doc("credentials").get();
    if (configDoc.exists) {
      return NextResponse.json(
        { error: "Admin setup already completed! If you need to reset, delete the adminConfig/credentials document in Firestore first." },
        { status: 409 }
      );
    }

    // Set up admin credentials
    await adminDb.collection("adminConfig").doc("credentials").set({
      accessKey,
      createdAt: new Date().toISOString(),
    });

    // Set up default school settings
    await adminDb.collection("adminConfig").doc("schoolSettings").set({
      schoolName,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Admin setup completed successfully! You can now register an admin account at /admin/login using this access key.",
      accessKey,
      schoolName,
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up admin: " + error.message },
      { status: 500 }
    );
  }
}
