import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/coach") && token?.role !== "coach") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/player") && token?.role !== "player") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/scout") && token?.role !== "scout") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/coach/:path*", "/player/:path*", "/scout/:path*"],
};
