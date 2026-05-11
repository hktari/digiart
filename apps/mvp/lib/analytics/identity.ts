import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const ANON_ID_COOKIE = "anon_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Get or create an anonymous ID for attribution tracking.
 * This ID is stored in a cookie and used to link pre-auth sessions
 * to users after they sign up.
 *
 * NOTE: Cookie creation can fail when called during Server Component
 * rendering (Next.js only allows cookie modifications in Server Actions
 * or Route Handlers). In that case, returns null.
 */
export async function getOrCreateAnonymousId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(ANON_ID_COOKIE)?.value;

  if (existingId) {
    return existingId;
  }

  const newId = randomUUID();
  try {
    cookieStore.set(ANON_ID_COOKIE, newId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } catch {
    // Cookies can only be modified in a Server Action or Route Handler.
    // This happens when called during SSR from a Server Component.
    return null;
  }

  return newId;
}

/**
 * Get the current anonymous ID if it exists, without creating a new one.
 */
export async function getAnonymousId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ANON_ID_COOKIE)?.value ?? null;
}

/**
 * Clear the anonymous ID cookie (useful after linking to a user account).
 */
export async function clearAnonymousId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ANON_ID_COOKIE);
}
