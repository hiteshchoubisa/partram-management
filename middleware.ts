import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isAuthed = req.cookies.get("pm_auth")?.value === "1";
  const { pathname } = req.nextUrl;

  // If already authed and on /login, send to dashboard
  if (isAuthed && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect management pages
  const protectedPrefixes = ["/dashboard", "/orders", "/visits", "/products", "/clients"];
  if (!isAuthed && protectedPrefixes.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/orders/:path*",
    "/visits/:path*",
    "/products/:path*",
    "/clients/:path*",
  ],
};