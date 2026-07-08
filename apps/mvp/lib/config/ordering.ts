/**
 * Ordering (paid checkout) kill-switch.
 *
 * A temporary, reversible flag that pauses paid ordering/checkout while we focus
 * on user acquisition. Browsing, subscribing to creators, and building a booklet
 * cart stay fully functional — only the pay/checkout step (and the admin
 * cycle-lock that charges collectors) is gated.
 *
 * Controlled by a single `NEXT_PUBLIC_ORDERING_ENABLED` env var so the same
 * value is readable on the server (route/action guards) and the client (UI
 * gating) with no drift. Default (unset) = enabled; only the literal string
 * "false" pauses ordering.
 *
 * Because it is a `NEXT_PUBLIC_` var it is inlined at build time, so flipping it
 * on/off requires a redeploy — expected for an env-var flag.
 *
 * This module is intentionally dependency-free so it is safe to import from both
 * client and server components.
 */
export function isOrderingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ORDERING_ENABLED !== "false";
}
