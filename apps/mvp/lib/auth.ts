import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import NextAuth, { type NextAuthResult } from "next-auth";
import Resend from "next-auth/providers/resend";
import { linkAttributionToLead } from "@/lib/analytics/attribution";
import { AnalyticsEvents, trackUserEvent } from "@/lib/analytics/events";
import { clearAnonymousId, getAnonymousId } from "@/lib/analytics/identity";
import { DEV_ROLES_COOKIE } from "@/lib/constants/dev";
import { db } from "@/lib/db";
import { getUserRoles } from "@/lib/roles";

const nextAuthResult: NextAuthResult = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.roles = await getUserRoles(user.id);
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl) || url.startsWith("/")) return url;
      return baseUrl;
    },
    async signIn({ user }) {
      // Track auth completion and link attribution
      // Wrapped in try/catch: analytics must never block sign-in
      if (user.id) {
        try {
          const anonymousId = await getAnonymousId();
          if (anonymousId) {
            // Find or create lead and link attribution
            const session = await db.attributionSession.findUnique({
              where: { anonymousId },
            });
            if (session) {
              await linkAttributionToLead(anonymousId, session.leadId ?? "");
            }
          }
          void trackUserEvent(user.id, AnalyticsEvents.AUTH_COMPLETED, {
            email: user.email ?? "",
          });
          await clearAnonymousId();
        } catch (error) {
          console.warn("[auth] Analytics tracking failed (non-fatal):", error);
        }
      }
      return true;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuthResult.handlers;
export const signIn: NextAuthResult["signIn"] = nextAuthResult.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuthResult.signOut;
const nextAuth: NextAuthResult["auth"] = nextAuthResult.auth;
export const middlewareAuth: NextAuthResult["auth"] = nextAuthResult.auth;

export async function auth() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS_TEST_USER_ID
  ) {
    const userId = process.env.AUTH_BYPASS_TEST_USER_ID;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      const cookieStore = await cookies();
      const cookieRoles = cookieStore.get(DEV_ROLES_COOKIE)?.value;
      const envRoles = process.env.AUTH_BYPASS_ROLES;
      const rawRoles = cookieRoles ?? envRoles;
      const roles: Role[] = rawRoles
        ? (rawRoles.split(",").map((r) => r.trim()) as Role[])
        : await getUserRoles(userId);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }
  return nextAuth();
}
