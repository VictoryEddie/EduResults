import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Verifies the session cookie from the request.
 * Returns the decoded token if valid, null otherwise.
 */
export async function verifySession(reqOrToken: NextRequest | string) {
  let token: string | undefined;
  
  if (typeof reqOrToken === "string") {
    token = reqOrToken;
  } else {
    const teacherCookie = reqOrToken.cookies.get("teacher-token")?.value;
    const parentCookie = reqOrToken.cookies.get("parent-token")?.value;
    token = teacherCookie || parentCookie;
  }

  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    return decoded;
  } catch {
    return null;
  }
}
