# Pause paid ordering behind a reversible flag

**Date:** 2026-07-07
**App:** `apps/mvp`
**Status:** Approved — ready for implementation plan

## Goal

Temporarily turn off paid **ordering / checkout** so we can focus on user
acquisition ("building momentum"), while keeping the whole top-of-funnel
(browse, subscribe/follow creators, build a booklet cart) fully working. The
pause is controlled by a single reversible env-var flag. When a collector
reaches the now-disabled pay step, they see a "coming soon" panel with a
"Notify me when ordering opens" action that is captured as a PostHog event +
durable CRM record, producing a warm-demand cohort to re-engage when ordering
reopens.

## Scope decisions (locked)

- **Disable:** the paid checkout only — `create-order`, `setup-intent`,
  `confirm-payment-method`, `charge-now`, and the charge-causing admin
  cycle-lock.
- **Keep working:** browse creators, subscribe/unsubscribe (free follow, no
  charge), release selection / booklet cart, Stripe & Peecho webhooks, creator
  payouts.
- **Blocked-state UX:** "coming soon" + "Notify me when ordering opens" capture.
- **Flag mechanism:** single env var, redeploy to flip. No DB schema change, no
  data migration.

## Context (from codebase exploration)

- There is **no automated billing scheduler** — cycles/charges only run when an
  admin manually hits the cycle-lock endpoint. So pausing ordering is about
  blocking the collector checkout endpoints + not running (and guarding) the
  admin lock. No cron to worry about.
- There is **no existing feature-flag mechanism**; env vars are read ad-hoc via
  `process.env.*`.
- `apps/mvp/lib/analytics/` already provides a server-side event layer:
  `trackUserEvent(userId, eventName, metadata)` sends to PostHog (identified)
  **and** writes a durable `LeadEvent` on the collector's `Lead` record, and
  forwards `metadata` to `identifyPostHogUser` (so metadata keys also become
  person properties). This is the capture mechanism — no new table needed.

## Design

### 1. The flag (single source of truth)

- New module `apps/mvp/lib/config/ordering.ts`:
  ```ts
  export function isOrderingEnabled(): boolean {
    return process.env.NEXT_PUBLIC_ORDERING_ENABLED !== "false";
  }
  ```
- Uses **one** `NEXT_PUBLIC_ORDERING_ENABLED` var so the same value is readable
  server-side (route guards) and client-side (UI gating) with no drift.
- Default (unset) = **enabled**. Only the literal string `"false"` pauses.
- Ops: to pause, set `NEXT_PUBLIC_ORDERING_ENABLED=false` on the mvp Railway
  service → redeploy. To resume, set `true` or remove the var → redeploy.
  (Env-var flag ⇒ flipping either way needs a ~2 min redeploy; expected.)
- Add `NEXT_PUBLIC_ORDERING_ENABLED` to `apps/mvp/.env.example` with a comment.

### 2. Server enforcement (money genuinely cannot move)

Small shared guard, e.g. `apps/mvp/lib/config/ordering.ts` →
`assertOrderingEnabled()` that throws / returns a `403` JSON `{ error:
"ordering_paused" }` when disabled. Applied at the **start** of each handler:

- `app/api/collector/create-order/route.ts`
- `app/api/collector/setup-intent/route.ts`
- `app/api/collector/confirm-payment-method/route.ts`
- `app/api/collector/charge-now/route.ts`
- `app/api/admin/cycles/[id]/lock/route.ts` — guard so an accidental lock can't
  run `freezeCollectorCycleQuotes` (Peecho order) / charge while paused.

Also guard the corresponding server action path used by the pay-at-lock flow
(`commitBookletForCycle` in `lib/actions/collector.ts`) if it can be reached
independently of the guarded routes — verify during implementation; guard at the
action level if so, so there is no unguarded commit path.

**Do not touch:** `subscribeToCreator*`, `unsubscribeFromCreator`, browse,
release-selection, `app/api/webhooks/stripe`, `app/api/webhooks/peecho`, payout
routes/actions.

### 3. UI — "coming soon + notify me" panel

In `apps/mvp/components/checkout-payment-form.tsx`, gate on
`isOrderingEnabled()`:

- **Enabled:** unchanged (current Pay CTAs at lines ~362 "Order Now" and ~382
  "Save & pay at cycle lock").
- **Disabled:** replace the two Pay CTAs with a paused panel:
  - Headline: "Printing opens soon"
  - Subtext: reassurance + follow-your-creators nudge
  - Button: "Notify me when ordering opens" → calls the `requestOrderingNotify`
    server action; on success show confirmation "We'll email you the moment it
    opens." (idempotent — repeat taps just re-confirm)
  - Keep the price/calc + cart summary visible so they see what they'd get.

The `/collector/checkout` page still renders (cart intact). Upstream
"Order booklet" / "Complete checkout" links are left as-is — they land on the
paused panel. (YAGNI: don't rewrite every CTA.)

### 4. PostHog / demand signal

Extend `apps/mvp/lib/analytics/events.ts` `AnalyticsEvents`:

- `ORDERING_PAUSED_VIEWED: "ordering_paused_viewed"`
- `ORDERING_NOTIFY_REQUESTED: "ordering_notify_requested"`

Behaviour:

- Paused panel first render → fire `ORDERING_PAUSED_VIEWED` with cart context
  metadata: `{ creator_count, item_count, quoted_price, cycle_id }`.
- "Notify me" click → new server action `requestOrderingNotify(input)` in
  `apps/mvp/lib/actions/collector.ts` that calls
  `trackUserEvent(userId, AnalyticsEvents.ORDERING_NOTIFY_REQUESTED, {
  ordering_intent: true, creator_count, item_count, quoted_price, cycle_id })`.
  - `trackUserEvent` → PostHog event (identified) **and** a durable `LeadEvent`
    on the collector's `Lead`; `ordering_intent: true` in metadata is forwarded
    to `identifyPostHogUser`, setting it as a **person property**.
- Result: a PostHog cohort `ordering_intent = true` (warm demand) that can be
  exported / emailed via Resend when ordering reopens, plus a persistent
  `LeadEvent` trail. No new table.

### 5. Testing

- **Unit:** `isOrderingEnabled()` — unset → true, `"false"` → false, `"true"` →
  true. `assertOrderingEnabled()` throws/403 when disabled.
- **Backend (vitest, mocked `NEXT_PUBLIC_ORDERING_ENABLED`):** each of the five
  guarded routes returns `403 {error:"ordering_paused"}` when disabled and
  behaves normally when enabled; a subscribe route stays unaffected either way.
- **Component:** `checkout-payment-form` renders the paused panel (no Pay CTAs)
  and invokes `requestOrderingNotify` when the flag is off; renders normal CTAs
  when on.
- **Manual:** set `NEXT_PUBLIC_ORDERING_ENABLED=false` locally, drive
  `/collector/checkout`, confirm the paused panel, the `ordering_paused_viewed`
  + `ordering_notify_requested` PostHog events, and the `LeadEvent` row.

## Reversibility & ops

- Pause: `NEXT_PUBLIC_ORDERING_ENABLED=false` on mvp Railway → redeploy.
- Resume: set `true` / remove → redeploy.
- No schema change, no data migration, no external-provider config change.

## Out of scope

- Admin DB toggle / instant flip without redeploy (possible future upgrade).
- Sending the actual "ordering is open" email (later, from the cohort).
- Landing-site changes (the landing "Open App" CTAs are unaffected — the pause
  lives inside the mvp app's checkout).
- Rewriting upstream cart/checkout entry CTAs.
