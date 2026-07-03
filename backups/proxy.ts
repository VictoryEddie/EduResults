import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

/* Route groups — used to determine which session type is required */
const teacherProtected = ["/teacher/dashboard", "/teacher/students", "/teacher/results", "/teacher/preview", "/teacher/print"];
const parentProtected = ["/parent/dashboard", "/parent/results"];
const adminProtected = ["/admin/dashboard", "/admin/teachers", "/admin/parents", "/admin/orphaned", "/admin/audit"];
const teacherAuth = ["/teacher/login", "/teacher/register"];
const parentAuth = ["/parent/login", "/parent/register"];
const adminAuth2 = ["/admin/login"];

/**
 * Verifies a Firebase session cookie using the Admin SDK.
 * More secure than just checking if the cookie exists — also checks for revocation.
 */
async function verifySessionCookie(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  try {
    await adminAuth.verifySessionCookie(cookie, true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs on every request matching the config matcher below.
 * Handles route protection and role-based access control for all portals.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const teacherCookie = req.cookies.get("teacher-token")?.value;
  const parentCookie = req.cookies.get("parent-token")?.value;

  /* Verify teacher and parent cookies cryptographically via Firebase Admin SDK */
  const isTeacher = await verifySessionCookie(teacherCookie);
  const isParent = await verifySessionCookie(parentCookie);

  /* Admin uses a simpler server-set cookie — just check presence */
  const isAdmin = !!req.cookies.get("admin-token")?.value;

  /* Admin route protection — redirect to login if not authenticated */
  if (adminProtected.some((p) => pathname.startsWith(p))) {
    if (!isAdmin) return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (adminAuth2.some((p) => pathname.startsWith(p))) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  /* Teacher route protection */
  if (teacherProtected.some((p) => pathname.startsWith(p))) {
    if (!isTeacher) return NextResponse.redirect(new URL("/teacher/login", req.url));
  }
  if (teacherAuth.some((p) => pathname.startsWith(p))) {
    if (isTeacher) return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
  }

  /* Parent route protection */
  if (parentProtected.some((p) => pathname.startsWith(p))) {
    if (!isParent) return NextResponse.redirect(new URL("/parent/login", req.url));
  }
  if (parentAuth.some((p) => pathname.startsWith(p))) {
    if (isParent) return NextResponse.redirect(new URL("/parent/dashboard", req.url));
  }

  /* Cross-role access prevention — each role can only access their own pages */
  if (pathname.startsWith("/teacher/") && isParent && !isTeacher) {
    return NextResponse.redirect(new URL("/parent/dashboard", req.url));
  }
  if (pathname.startsWith("/parent/") && isTeacher && !isParent) {
    return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
  }

  /* Prevent browser from caching protected pages — stops back-button access after logout */
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/teacher/:path*", "/parent/:path*", "/admin/:path*"],
};
