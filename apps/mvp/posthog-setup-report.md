<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Booklet Drops art subscription platform. Here is a summary of every change made:

**Client-side SDK installed** (`posthog-js`) and initialised in `instrumentation-client.ts` alongside the existing Sentry init. PostHog is configured to route events through a Next.js reverse proxy (`/ingest`) for ad-blocker resilience, using the EU PostHog host.

**Reverse proxy rewrites** were added to `next.config.ts` (`/ingest/static/*`, `/ingest/array/*`, `/ingest/*` → `eu-assets.i.posthog.com` / `eu.i.posthog.com`).

**User identification** component (`components/providers/posthog-identifier.tsx`) calls `posthog.identify()` with the user's ID, email, and name whenever a next-auth session is present, and `posthog.reset()` when there is none. It is mounted in the root layout inside the `AuthProvider`.

**Environment variables** were written to `.env.local`: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_API_KEY`, and `POSTHOG_HOST`.

**A new event** (`release_created`) was added to the `AnalyticsEvents` taxonomy in `lib/analytics/events.ts`.

**Server-side events** were added to three server actions, using the existing `trackUserEvent` / `trackAnonymousEvent` infrastructure:

| File | Event added |
|------|------------|
| `lib/actions/auth.ts` | `auth_magic_link_sent` after `signIn("resend", …)` succeeds |
| `lib/actions/roles.ts` | `role_selected_creator` or `role_selected_collector` after `addRole()` |
| `lib/actions/releases.ts` | `release_created` in `createRelease()` |
| `lib/actions/releases.ts` | `creator_release_published` in `publishRelease()` |

**Client-side events** were added in two interactive components using `posthog.capture()` directly:

| File | Event added |
|------|------------|
| `components/new-release-form.tsx` | `release_created` after the full multi-step form succeeds |
| `components/release-actions.tsx` | `creator_release_published` after a successful publish click |

## Event summary

| Event name | Description | File(s) |
|---|---|---|
| `auth_magic_link_sent` | User submitted sign-in form; magic link email dispatched | `lib/actions/auth.ts` |
| `auth_completed` | User clicked magic link and authentication completed (pre-existing) | `lib/auth.ts` |
| `role_selected_creator` | User selected the Creator role during onboarding | `lib/actions/roles.ts` |
| `role_selected_collector` | User selected the Collector role during onboarding | `lib/actions/roles.ts` |
| `release_created` | Creator successfully created a new release draft | `lib/actions/releases.ts`, `components/new-release-form.tsx` |
| `creator_release_published` | Creator published a release, making it visible to collectors | `lib/actions/releases.ts`, `components/release-actions.tsx` |
| `identify` | Client-side user identification on session change | `components/providers/posthog-identifier.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behaviour:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/173494/dashboard/664053
- **Creator activation funnel** (sign-in → auth → creator role → release created → published): https://eu.posthog.com/project/173494/insights/y5jWCP0b
- **Daily new user signups** (DAU of auth_completed): https://eu.posthog.com/project/173494/insights/Lmg453ze
- **Role selection: Creator vs Collector** (bar chart, last 30 days): https://eu.posthog.com/project/173494/insights/SbT8koDk
- **Release activity: Created vs Published** (line chart, last 30 days): https://eu.posthog.com/project/173494/insights/6BanCPPc
- **Auth funnel: Magic link sent → Completed** (email confirmation drop-off): https://eu.posthog.com/project/173494/insights/uXyKuI2Z

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
