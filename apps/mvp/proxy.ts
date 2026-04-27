import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { middlewareAuth } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const session = await middlewareAuth();
  if (!session) {
    const signIn = new URL("/auth/sign-in", req.url);
    signIn.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/creator/:path*", "/collector/:path*", "/admin/:path*"],
};
