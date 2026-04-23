import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { getUserRoles } from "@/lib/roles";

const nextAuthResult = NextAuth({
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
      return `${baseUrl}/onboarding`;
    },
  },
});

export const { handlers, signIn, signOut, auth: nextAuth } = nextAuthResult;

export async function auth() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS_TEST_USER_ID
  ) {
    const userId = process.env.AUTH_BYPASS_TEST_USER_ID;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      const roles = await getUserRoles(userId);
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
