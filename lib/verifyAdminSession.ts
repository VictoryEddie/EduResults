import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * Verifies the admin session token from cookies against Firestore.
 * Returns the session data if valid, null otherwise.
 */
export async function verifyAdminSession(reqOrToken: NextRequest | string) {
  const token = typeof reqOrToken === "string" ? reqOrToken : reqOrToken.cookies.get("admin-token")?.value;
  if (!token) return null;

  try {
    const sessionDoc = await adminDb.collection("adminSessions").doc(token).get();
    if (!sessionDoc.exists) return null;

    const data = sessionDoc.data();
    if (!data) return null;

    /* Check if expired */
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      /* Cleanup expired session */
      await adminDb.collection("adminSessions").doc(token).delete();
      return null;
    }

    return data;
  } catch (error) {
    console.error("Admin verification error:", error);
    return null;
  }
}
