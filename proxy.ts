import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * LIGHTWEIGHT EDGE PROXY (Next.js 16 Compatible)
 * -----------------------------------------------
 * Runs on Next.js Edge Runtime. Does lightweight cookie presence checks
 * and security header injection. Full database session verification
 * is performed securely in Server Component Layouts and API Routes.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasAdmin = req.cookies.has("admin-token");
  const hasTeacher = req.cookies.has("teacher-token");
  const hasParent = req.cookies.has("parent-token");

  /* Portal Root Redirects — Prevent 404s on bare portal roots */
  if (pathname === "/admin") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  if (pathname === "/teacher") return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
  if (pathname === "/parent") return NextResponse.redirect(new URL("/parent/dashboard", req.url));

  /* Admin Protection Gatekeeper */
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasAdmin) return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  /* Teacher Protection Gatekeeper */
  if (
    pathname.startsWith("/teacher") &&
    !pathname.startsWith("/teacher/login") &&
    !pathname.startsWith("/teacher/register") &&
    !pathname.startsWith("/teacher/forgot-password")
  ) {
    if (!hasTeacher) return NextResponse.redirect(new URL("/teacher/login", req.url));
  }

  /* Parent Protection Gatekeeper */
  if (
    pathname.startsWith("/parent") &&
    !pathname.startsWith("/parent/login") &&
    !pathname.startsWith("/parent/register") &&
    !pathname.startsWith("/parent/forgot-password")
  ) {
    if (!hasParent) return NextResponse.redirect(new URL("/parent/login", req.url));
  }

  /* Cache-Control Headers to prevent browser caching of protected pages */
  const response = NextResponse.next();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/parent")
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/admin",
    "/teacher",
    "/parent",
  ],
};
