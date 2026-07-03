import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    // Try to list users to test Admin SDK
    const listUsersResult = await adminAuth.listUsers(1);

    // Test if we can create a session cookie (simulate what login does)
    const testUserId = listUsersResult.users[0]?.uid;
    let sessionCookieTest: { success: boolean; error: string | null; code?: string } = { success: false, error: null };

    if (testUserId) {
      try {
        // Create a custom token and then verify it
        const customToken = await adminAuth.createCustomToken(testUserId);
        const idToken = customToken; // In real scenario, this would be exchanged

        // Try to create session cookie
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
          expiresIn: 24 * 60 * 60 * 1000,
        });

        sessionCookieTest = { success: true, error: null };
      } catch (cookieError: any) {
        sessionCookieTest = {
          success: false,
          error: cookieError.message,
          code: cookieError.code,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Firebase Admin SDK is working correctly",
      userCount: listUsersResult.users.length,
      initialized: true,
      sessionCookieTest,
      envVars: {
        hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Firebase Admin Test Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Firebase Admin SDK initialization failed",
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        envVars: {
          hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
          privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
        },
      },
      { status: 500 },
    );
  }
}
