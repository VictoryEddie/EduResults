import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/verifyAdminSession";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const doc = await adminDb.collection("adminConfig").doc("schoolSettings").get();
    if (!doc.exists) {
      return NextResponse.json({
        settings: {
          schoolName: "EduResults",
          location: "Location not set",
          motto: "Excellence in Education",
          logo: null,
        }
      });
    }
    return NextResponse.json({ settings: doc.data() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await checkRateLimit(`admin-settings:${ip}`, 10, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  const session = await verifyAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  if (session.isDemo) {
    return NextResponse.json(
      { error: "Demo accounts cannot update school settings." },
      { status: 403 }
    );
  }

  try {
    const { settings } = await req.json();
    if (!settings || !settings.schoolName) {
      return NextResponse.json({ error: "School name is required." }, { status: 400 });
    }

    await adminDb.collection("adminConfig").doc("schoolSettings").set({
      ...settings,
      updatedAt: new Date().toISOString(),
    });

    await adminDb.collection("auditLog").add({
      action: "school_settings_updated",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
