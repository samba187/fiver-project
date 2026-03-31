import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for our secure custom cookie set on login
  const session = request.cookies.get("fiver_session")?.value;

  // Protect all /staff routes except the login page itself
  if (
    request.nextUrl.pathname.startsWith("/staff") &&
    request.nextUrl.pathname !== "/staff"
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/staff", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
