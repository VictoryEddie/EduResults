import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { adminDb } from "@/lib/firebaseAdmin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    if (!checkRateLimit(`send-email:${email}`, 5, 60 * 60 * 1000)) {
      const { error, status } = rateLimitResponse();
      return NextResponse.json({ error }, { status });
    }

    // Fetch school settings for email branding
    const settingsDoc = await adminDb.collection("adminConfig").doc("schoolSettings").get();
    const schoolName = settingsDoc.exists ? settingsDoc.data()!.schoolName : "EduResults";

    await sendMail({
      to: email,
      fromName: schoolName,
      subject: `Welcome to ${schoolName}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h1 style="color: #1B2B4B; font-size: 24px;">Congratulations, ${name}!</h1>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your teacher account on <strong>${schoolName}</strong> has been successfully created.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Please verify your email address by clicking the verification link that will be sent to this inbox.
            Once verified, you can sign in and start managing your class results.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">Welcome aboard!</p>
          <p style="color: #1B2B4B; font-weight: bold; font-size: 15px;">The ${schoolName} Team</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
