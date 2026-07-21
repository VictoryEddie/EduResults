import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { cookies } from "next/headers";

/**
 * LIGHTWEIGHT PROXY (Edge-Safe)
 * ---------------------------------
 * This runs on the Edge Runtime. We only do simple existence checks for cookies here
 * to prevent crashes. Full cryptographic/database verification is done in the 
 * Server Component Layouts where we have access to the full Node.js runtime.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieStore = await cookies();

  const hasAdmin = cookieStore.has("admin-token");
  const hasTeacher = cookieStore.has("teacher-token");
  const hasParent = cookieStore.has("parent-token");

  /* Portal Root Redirects — Prevent 404s on directory roots */
  if (pathname === "/admin") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  if (pathname === "/teacher") return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
  if (pathname === "/parent") return NextResponse.redirect(new URL("/parent/dashboard", req.url));

  /* Admin Protection Gatekeeper */
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasAdmin) return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  /* Teacher Protection Gatekeeper */
  if (pathname.startsWith("/teacher") && 
      !pathname.startsWith("/teacher/login") && 
      !pathname.startsWith("/teacher/register") && 
      !pathname.startsWith("/teacher/forgot-password")) {
    if (!hasTeacher) return NextResponse.redirect(new URL("/teacher/login", req.url));
  }

  /* Parent Protection Gatekeeper */
  if (pathname.startsWith("/parent") && !pathname.startsWith("/parent/login") && !pathname.startsWith("/parent/register")) {
    if (!hasParent) return NextResponse.redirect(new URL("/parent/login", req.url));
  }

  return NextResponse.next();
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
