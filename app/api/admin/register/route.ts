import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse, getIP } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!checkRateLimit(`admin-register:${ip}`, 5, 60 * 60 * 1000)) {
    const { error, status } = rateLimitResponse();
    return NextResponse.json({ error }, { status });
  }

  try {
    const { name, email, accessKey, password } = await req.json();

    if (!name || !email || !accessKey || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    /* Validate the access key against the adminConfig collection */
    const configDoc = await adminDb.collection("adminConfig").doc("credentials").get();
    if (!configDoc.exists) {
      return NextResponse.json({ error: "Admin setup not configured. Contact the system administrator." }, { status: 403 });
    }

    const config = configDoc.data();
    const isKeyValid = await bcrypt.compare(accessKey, config?.accessKey || "");
    if (!isKeyValid) {
      return NextResponse.json({ error: "Invalid access key." }, { status: 401 });
    }

    /* Check if an admin account already exists with this email */
    const existing = await adminDb.collection("admins").where("email", "==", email.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: "An admin account with this email already exists." }, { status: 409 });
    }

    /* Hash the password before storing — salt rounds of 12 is the recommended minimum */
    const hashedPassword = await bcrypt.hash(password, 12);

    await adminDb.collection("admins").add({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    /* Audit log */
    await adminDb.collection("auditLog").add({
      action: "admin_registered",
      name,
      email: email.toLowerCase(),
      ip,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
