# MVP Phase 1 Foundation Plan

## Phase 1 Goal

Establish the new MVP app as a separate app in the monorepo with the minimum foundations required to launch a creator-led monthly booklet subscription flow:

- minimal creator onboarding
- public creator profile links for acquisition
- collector sign-up starting from a creator link
- creator artwork upload and monthly release publishing
- collector creator subscription and release selection
- platform-controlled recurring subscription pricing with POD-backed quote estimates
- global monthly cycle dates for lock-in and fulfillment
- creator and collector email notifications to keep users on the happy path

Phase 1 is intentionally not the full production fulfillment system. It should prepare the app for later booklet generation, POD ordering, delivered-artwork tracking, and payout calculation.

## In Scope

- New MVP app in the monorepo
- NextAuth.js with Prisma
- One user account that can hold both `creator` and `collector` roles
- Minimal creator onboarding focused on:
  - public profile
  - payout readiness
  - artwork upload
  - first release creation
  - shareable public link
- Collector entry via creator profile link
- Collector account creation and creator subscription
- Collector release selection flow
- Creator monthly releases
- Release-level tags for creator organization and collector filtering
- Browse and discovery for additional creators and releases after first subscription
- Platform-controlled base subscription pricing
- Peecho integration layer for offering lookup and real-time pricing quotes
- Global monthly cycle dates:
  - selection lock date
  - fulfillment processing date
- Notification system for creators and collectors
- Booklet eligibility enforced by page range
- Planning assumption: `1 artwork = 1 page`
- Foundation for orientation-aware page filling later
- Fulfillment blocking if, at lock date, a collector cannot be assigned enough eligible pages to meet the minimum booklet page range

## Out of Scope

- Final booklet composition engine
- Automated PDF generation for POD orders
- Full POD production ordering in production
- Full recurring billing implementation
- Automated creator payout disbursement
- Duplicate-artwork prevention implementation end-to-end
- Advanced recommendation engine
- Rich creator profile customization
- Marketplace-style art browsing product
- Complex issue-centric model

## Data Model

### Must Exist in Phase 1

#### Auth and identity
- `User`
- `Account`
- `Session`
- `VerificationToken`
- `UserRole`

Reason:
One account must support both creator and collector roles.

#### Creator data
- `CreatorProfile`
  - user relation
  - slug
  - display name
  - avatar
  - short bio
  - publish status
- `CreatorPayoutProfile`
  - minimum payout/compliance fields needed for future payout readiness
- `CreatorSocialLink`
  - generic label + URL records only

Reason:
Creators already have their audience on external platforms. The app profile is a conversion and subscription page, not a full creator website builder.

#### Collector data
- `CollectorProfile`
  - user relation
  - display name
  - shipping country
  - onboarding state

#### Content and release data
- `Artwork`
  - creator-owned uploaded image asset
  - basic title/status/storage reference
  - orientation metadata placeholder
- `Release`
  - creator-owned monthly release
  - cycle relation
  - publish status
- `ReleaseArtwork`
  - join between release and artworks
- `Tag`
- `ReleaseTag`

Reason:
Tags attach to releases and should support both creator-side organization and collector-side filtering.

#### Collector selection data
- `CollectorCreatorSubscription`
  - collector subscribes to creator
  - active state
  - entry creator tracking if useful
- `CollectorReleaseSelection`
  - releases selected by collector for current cycle participation

Reason:
Collectors start from a creator profile, subscribe to that creator, then expand their booklet range by selecting releases.

#### Cycle and constraints
- `SubscriptionCycle`
  - cycle label/month
  - selection open date
  - global lock date
  - fulfillment processing date
  - status
- `BookletConstraint`
  - minimum pages
  - maximum pages
  - max creators or max releases if needed
  - active flag/versioning field if needed

Reason:
Eligibility is based on a configurable page range. For Phase 1, assume `1 artwork = 1 page`. Orientation-aware fitting will come later, but artwork orientation should be captured now.

#### POD pricing and product config
- `PodProviderConfig`
  - provider name
  - environment
  - active flag
- `PodOffering`
  - Peecho offering ID
  - name
  - supported page range
  - dimensions
  - pricing metadata snapshot
- `PricingQuoteSnapshot`
  - collector
  - cycle
  - country
  - offering
  - requested page count
  - returned shipping amount
  - returned product amount
  - returned tax amount
  - returned total estimate
  - quoted at timestamp

Reason:
Peecho supports quote-based pricing before order creation, so pricing should be modeled around live quote inputs instead of a hardcoded shipping table.

#### Notifications
- `NotificationPreference`
  - minimal opt-in / channel controls if needed
- `EmailNotificationLog`
  - type
  - recipient
  - cycle
  - status
  - sent timestamp

Reason:
The no-new-art edge case is prevented operationally through notifications, not solved only at fulfillment time.

### Deferred Until Later Phase

- `BookletComposition`
- `BookletCompositionArtwork`
- `GeneratedPrintFile`
- `PodOrder`
- `PodShipment`
- `CollectorArtworkReceipt`
- `CreatorPayout`
- `CreatorPayoutLineItem`
- `Recommendation`
- `ReplacementSuggestion`
- `Payment`
- `Invoice`
- `Refund`

### Remove or Simplify From Earlier Ideas

- Remove creator-defined subscription pricing
- Remove fixed creator social fields such as `instagramUrl`
- Remove rigid `Issue -> Order` modeling from Phase 1
- Use `Release` as the creator publishing unit instead of an issue-centric fulfillment model
- Do not add final composition tables yet
- Do not add full payout tables yet
- Do not add full POD order and shipment tables yet

## Routes

### Public
- `/`
- `/auth/sign-in`
- `/auth/sign-up`
- `/creators/[slug]`
- `/creators/[slug]/subscribe`
- `/browse`
- `/browse/creators`
- `/browse/releases`

### Shared Authenticated
- `/onboarding`
- `/account`
- `/account/roles`
- `/notifications`

### Creator
- `/creator`
- `/creator/setup`
- `/creator/profile`
- `/creator/payout`
- `/creator/artworks`
- `/creator/artworks/new`
- `/creator/artworks/[id]`
- `/creator/releases`
- `/creator/releases/new`
- `/creator/releases/[id]`
- `/creator/share`

### Collector
- `/collector`
- `/collector/setup`
- `/collector/subscriptions`
- `/collector/releases`
- `/collector/pricing`
- `/collector/lock-status`
- `/collector/discover`

### Admin and Platform
- `/admin`
- `/admin/pod`
- `/admin/pricing`
- `/admin/booklet-constraints`
- `/admin/cycles`
- `/admin/notifications`
- `/admin/creators`

### API
- `/api/auth/[...nextauth]`
- `/api/uploads/*`
- `/api/creators/*`
- `/api/releases/*`
- `/api/subscriptions/*`
- `/api/pricing/quote`
- `/api/notifications/*`
- `/api/admin/*`

## Auth and Onboarding

### Creator Onboarding

Goal:
Make creator onboarding the least work possible while still making the creator ready to share their profile and receive future payouts.

Steps:
1. Sign up with email magic link.
2. Add `creator` role.
3. Complete the minimum setup:
   - display name
   - slug
   - avatar
   - short bio
   - payout details
   - first artworks
   - first release
4. Publish profile.
5. Show shareable public profile link.

Constraints:
- Do not build a highly customizable profile editor.
- Treat the profile as a subscription conversion page.
- Optimize for `sign up -> upload -> publish -> share`.

### Collector Onboarding

Goal:
Collectors should usually enter the app through a creator link, subscribe quickly, then expand to additional creators and releases.

Steps:
1. Collector lands on creator public profile.
2. Clicks subscribe/select creator.
3. Signs up with email magic link if needed.
4. Gets `collector` role/profile.
5. Enters shipping country.
6. Sees monthly estimated price:
   - platform base price
   - Peecho quote component
   - total recurring estimate
7. Confirms creator subscription.
8. Is guided to discover more creators and select releases.

## Notification Strategy

### Core Principle

Use proactive creator and collector email notifications to prevent the `no new art` fulfillment failure case.

### Creator Notifications
- welcome email
- onboarding incomplete reminder
- release creation reminder before cycle cutoff
- release missing / incomplete warning
- release published confirmation
- reminder when subscribed collectors are at risk due to insufficient new eligible art

### Collector Notifications
- welcome email
- complete setup reminder
- price estimate / subscription confirmation
- reminder to select releases before lock date
- upcoming lock date reminder
- lock confirmation
- warning when a selected creator is at risk of having no new eligible art
- prompt to choose a similar creator or update selections before lock date
- blocked fulfillment notice if minimum booklet pages cannot be met at lock date

### Fulfillment Failure Rule

If at the global lock date the system cannot assemble a booklet that satisfies the configured minimum page count, fulfillment is blocked and the collector is not charged.

This is an edge case. The system should do everything possible before lock date to prevent it.

## POD Integration Notes

Target provider for planning: Peecho.

Key Phase 1 implications:
- use Peecho offerings as the booklet product definition
- use Peecho quote endpoint for pricing estimates
- store offering metadata locally for admin control and UI use
- do not build final order submission yet

Important Peecho fit notes:
- pricing can be quoted before order creation
- offering metadata includes dimensions and page ranges
- final order creation requires print-ready file URLs, which means a future booklet/PDF generation layer will be needed

## Eligibility and Fulfillment Assumptions

- Eligibility is constrained by booklet page range
- Planning assumption: `1 artwork = 1 page`
- Orientation matters and will need a later layout/composition pass
- Final booklet generation logic is deferred
- Releases are the collector-facing selection unit
- If a creator has no new art for the cycle, notifications should attempt to drive reselection before lock date
- If the page minimum still cannot be met at lock date, do not fulfill and do not charge

## Execution Tickets

1. Create the new MVP app in the monorepo and align base tooling with current workspace conventions.
2. Set up Prisma, database config, and NextAuth core tables.
3. Implement multi-role user support so one account can be both creator and collector.
4. Build magic-link auth and onboarding entry flow.
5. Implement minimal creator onboarding with profile, payout readiness, publish readiness, and shareable slug.
6. Implement generic creator social links as a simple repeatable list.
7. Implement app-managed artwork upload and storage.
8. Implement artwork CRUD with minimal metadata and orientation capture.
9. Implement monthly releases with publish state and artwork assignment.
10. Implement release tags for creator organization and collector filtering.
11. Build public creator profile pages as the primary collector acquisition path.
12. Implement collector onboarding from creator profile links, including shipping country capture.
13. Implement collector creator subscription records.
14. Implement collector release selection records.
15. Build collector browse and discovery for creators and releases filtered by tags.
16. Add `SubscriptionCycle` with globally managed lock and fulfillment dates.
17. Implement booklet constraint configuration using page-range rules.
18. Integrate Peecho offering sync/config and pricing quote service boundary.
19. Persist quote snapshots for UI continuity and later auditability.
20. Implement notification trigger framework and email templates for onboarding, reminders, lock dates, and insufficient-content warnings.
21. Implement pre-lock detection logic for insufficient eligible pages and trigger reselection notifications.
22. Implement fulfillment blocking rule when minimum page count cannot be met at lock date.
23. Define future-ready interfaces for booklet generation, POD order submission, delivered-artwork tracking, and payout calculation.
24. Validate role gating, cycle gating, quote fallback behavior, and notification trigger behavior.

## Open Questions

- What exact payout/compliance fields are required at creator onboarding?
- Which Peecho offering will be the canonical booklet product for MVP?
- Is the recurring collector price fixed after lock date, or can final POD inputs still change it before fulfillment?
- Are collectors selecting creators, releases, or both in the primary UX path?
- What exact page range should be the first default booklet constraint?
- How should orientation-aware page filling work once composition is implemented?
- When should `do not send the same artwork twice` become a first-class stored record?
- Should tags be fully creator-defined in MVP, or lightly curated/admin-moderated?
- What email provider and template system should be used for notifications?
- What is the acceptable fallback if Peecho quote requests are temporarily unavailable?

## Notes for the Coding Agent

- This document is a foundation-first implementation plan, not a request to build the full product.
- Keep the first schema and route set minimal.
- Favor additive extension points over speculative complexity.
- Preserve a clean separation between:
  - content and release management
  - collector selection state
  - pricing quote state
  - future fulfillment and payout state
- Do not prematurely implement booklet generation, POD order creation, or payout accounting in Phase 1.
