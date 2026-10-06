import { NextResponse, type NextRequest } from "next/server";

// API authorization is intentionally repeated at the handler boundary; the proxy is not the security boundary.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/rsvp") ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Referrer-Policy", "same-origin");
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/rsvp/:path*", "/api/:path*"],
};
