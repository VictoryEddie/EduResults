import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

/**
 * Verifies the admin session token from cookies against Firestore.
 * Returns the session data if valid, null otherwise.
 */
export async function verifyAdminSession(reqOrToken: NextRequest | string) {
  const token = typeof reqOrToken === "string" ? reqOrToken : reqOrToken.cookies.get("admin-token")?.value;
  if (!token) return null;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const sessionDoc = await adminDb.collection("adminSessions").doc(hashedToken).get();
    if (!sessionDoc.exists) return null;

    const data = sessionDoc.data();
    if (!data) return null;

    /* Check if expired */
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      /* Cleanup expired session asynchronously (fire-and-forget) */
      adminDb.collection("adminSessions").doc(hashedToken).delete().catch(() => {});
      return null;
    }

    return data;
  } catch (error) {
    console.error("Admin verification error:", error);
    return null;
  }
}
