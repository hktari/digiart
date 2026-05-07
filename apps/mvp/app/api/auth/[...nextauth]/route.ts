import { type NextRequest, NextResponse } from "next/server";
import { auth as bypassAuth, handlers } from "@/lib/auth";

const { GET: nextAuthGET, POST } = handlers;

async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Intercept session endpoint for dev bypass
  if (
    pathname === "/api/auth/session" &&
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS_TEST_USER_ID
  ) {
    const session = await bypassAuth();
    return NextResponse.json(session);
  }

  return nextAuthGET(request);
}

export { GET, POST };
