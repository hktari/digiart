import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { middlewareAuth } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS_TEST_USER_ID
  ) {
    return NextResponse.next();
  }

  const session = await middlewareAuth();
  if (!session && !req.nextUrl.pathname.includes("/auth/sign-in")) {
    const signIn = new URL("/auth/sign-in", req.url);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/creator/:path*", "/collector/:path*", "/admin/:path*"],
};
