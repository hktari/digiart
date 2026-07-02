# MVP GTM Strategy and Lead Tracking

## Why this plan fits the current MVP

The current product is not a broad marketplace yet. The strongest live acquisition path in `apps/mvp` is:

1. public creator page at `/creators/[slug]`
2. collector intent via subscribe CTA
3. auth via email
4. collector setup with shipping country
5. creator subscription
6. release selection
7. pricing view
8. checkout readiness

That means MVP GTM should be creator-led, not generic top-of-funnel paid traffic. The product already supports:

- creator profiles and shareable public pages
- creator release publishing
- collector onboarding from creator links
- creator subscriptions and release selection
- pricing transparency page

The product does not yet support a mature lead system, attribution model, or analytics in `apps/mvp`. The old `apps/landing` app has basic Umami event tracking and waitlist patterns that can be reused as reference, but active product work is happening in `apps/mvp`.

## GTM objective for the MVP

The MVP goal is not maximum traffic. It is proving a repeatable loop:

1. recruit a small set of creators with real audiences
2. give each creator a clean public page and simple share prompt
3. convert follower traffic into collector signups and subscriptions
4. measure which creators, channels, and messages produce qualified collectors
5. use early conversion data to decide whether to scale creator outreach, collector acquisition, or both

## Recommended wedge

Focus the MVP on one narrow promise:

"Artist-curated printed booklet subscriptions for digital art fans."

Do not lead with a marketplace message. Do not lead with generic merch. Do not lead with complex creator tooling. The strongest value props in the current product are:

- creators can monetize existing back catalog and new releases without fulfillment overhead
- collectors get a tangible, collectible experience instead of another digital feed
- pricing is transparent

## Ideal customer profiles

### Primary supply-side ICP: creators

Prioritize creators who have:

- 5k to 100k followers on Instagram, DeviantArt, Civitai, X, or similar channels
- a recognizable visual style
- an archive large enough to build recurring releases
- follower engagement that suggests fandom, not just passive views
- willingness to share a single link and test a recurring product with fans

Best first creator segments:

- digital illustrators
- concept artists
- stylized fantasy / sci-fi artists
- tattoo flash artists
- AI-native artists with highly engaged collectors

### Primary demand-side ICP: collectors

Target followers who already:

- save or revisit creator posts
- buy prints, zines, Patreons, or limited drops
- want a physical artifact, not just access
- care about curation and artist taste more than one-off image selection

## Positioning by audience

### For creators

Use these messages first:

- recurring income from your existing audience
- your work as a collectible printed object
- no inventory, printing, shipping, or VAT handling on your side
- artist-curated releases instead of generic print-store management

### For collectors

Use these messages first:

- support creators with something worth keeping
- receive curated printed booklet drops, not disposable feed content
- discover releases through creators you already follow
- see exactly what you are paying for

## Phase 1 GTM motion

### Motion: creator-led inbound + founder-led outbound

For the MVP, use a two-sided but supply-first strategy.

#### 1. Recruit 10 to 20 pilot creators

Primary channels:

- founder outbound DM and email
- warm community outreach in DeviantArt, Instagram, Civitai, Discord
- selective manual scouting of creators with strong visual cohesion

Target outcome:

- 5 active creators who publish at least one release
- 3 creators who actively promote their public page
- enough audience traffic to observe real collector behavior

#### 2. Use creator pages as the acquisition surface

Each pilot creator should get:

- one shareable creator URL
- a short launch blurb they can post in bio, story, post caption, Discord, or newsletter
- one clear CTA: subscribe to this creator's printed booklet flow

#### 3. Run channel tests with tight attribution

Test only a few channels at first:

- creator Instagram stories and link-in-bio
- creator DeviantArt journals / comments / profile links
- creator Discord announcements
- founder direct outreach to creators
- founder-owned social proof posts documenting the first creators or first booklet mockups

Avoid broad paid acquisition until you know:

- collector signup rate from creator traffic
- collector subscribe rate after signup
- whether collectors actually proceed to release selection and pricing

## 90-day GTM plan

### Phase A: founder validation, weeks 1 to 3

Targets:

- recruit 10 pilot creators
- onboard at least 5 to published status
- instrument funnel events and source attribution

Work:

- create a creator recruitment list in a CRM or Airtable
- standardize outreach messages by creator segment
- add UTM and referral capture to `apps/mvp`
- define funnel dashboard and weekly reporting

### Phase B: creator activation, weeks 4 to 6

Targets:

- get creators to share their public pages
- generate first 100 to 300 qualified visits to creator pages
- achieve first collector signups and subscriptions

Work:

- give creators a launch kit: sample copy, images, CTA guidance
- create two or three message variants per audience
- review creator page performance weekly

### Phase C: conversion optimization, weeks 7 to 10

Targets:

- improve creator page to signup conversion
- improve signup to collector-setup completion
- improve collector setup to creator subscription

Work:

- tighten copy on public home and creator profile pages
- simplify callback URLs and preserve attribution across auth
- add nudge emails for incomplete setup and incomplete subscription

### Phase D: repeatable loop, weeks 11 to 13

Targets:

- identify best-performing creator segment and best-performing channel
- identify baseline conversion and activation metrics
- decide whether next investment is more creators, better collector conversion, or a waitlist/pre-launch flow

## Channel strategy

### Highest priority

#### 1. Creator audience distribution

This should be the main acquisition engine for the MVP because it matches the current product architecture.

Examples:

- link in bio to `/creators/[slug]`
- launch story with UTM-tagged creator page link
- Discord announcement linking to creator page
- post caption with a short explanation and CTA

#### 2. Founder outbound to creators

Use this to build supply and learn objections quickly.

Track:

- creators contacted
- reply rate
- meeting rate
- creator activation rate
- publish rate
- creator-generated visitor and signup counts

#### 3. Founder content documenting the build

This is useful because it creates credibility with creators and future collectors.

Content types:

- first creator onboarded
- first release published
- booklet mockups and physical proof quality
- transparent pricing breakdown examples

### Medium priority

#### 4. Niche community seeding

Place posts where digital art fans already gather. Use this carefully and only where native.

Examples:

- DeviantArt journals
- artist Discord servers with permission
- subreddit posts if value-first and compliant

### Low priority for MVP

- SEO-heavy blog strategy
- paid Meta or TikTok acquisition
- affiliate networks
- press outreach

These can wait until conversion and retention are clearer.

## Core funnel

### Creator funnel

1. creator lead created
2. creator contacted
3. creator replied
4. creator onboarded to account
5. creator profile published
6. creator release published
7. creator shared public link
8. creator generated first collector signup
9. creator generated first collector subscription

### Collector funnel

1. visit public home or creator page
2. click subscribe or signup CTA
3. create account / start auth
4. complete collector setup
5. subscribe to creator
6. select at least one release
7. view pricing
8. become checkout-eligible
9. complete checkout when enabled

For MVP reporting, the single most important conversion path is:

`creator page visit -> sign up -> collector setup complete -> creator subscribed`

## North star and supporting metrics

### North star

Active subscribed collectors per active published creator

### Leading indicators

- creator page visitors by creator
- unique visitors from creator-owned links
- signup starts
- signup completions
- collector setup completions
- creator subscriptions created
- release selection rate
- pricing page view rate

### Supply metrics

- creator outreach reply rate
- creator onboarding completion rate
- creator publish rate
- creator share rate
- median visitors generated per creator

### Quality metrics

- signup to subscription conversion by source
- subscription to release-selection conversion by source
- share of collectors who become checkout-eligible
- country mix of collectors to validate shipping scope

## Recommended lead and signup tracking system

Build the first version inside `apps/mvp` and keep it lightweight. Do not start with a separate sales or growth stack as the source of truth.

### Guiding principles

- use the app database as the system of record
- capture attribution once and preserve it through auth and onboarding
- track only the events needed for funnel decisions
- support both creator acquisition and collector acquisition

## Data model recommendation

Add these Prisma models to `apps/mvp/prisma/schema.prisma`.

### 1. `Lead`

Purpose: one record for any known prospect before or after signup.

Recommended fields:

- `id`
- `email` nullable until known
- `type` enum: `CREATOR`, `COLLECTOR`
- `status` enum: `NEW`, `CONTACTED`, `REPLIED`, `QUALIFIED`, `DISQUALIFIED`, `SIGNED_UP`, `ACTIVATED`
- `source` string nullable, for human-readable source like `instagram_dm`, `creator_link`, `deviantart_outreach`
- `campaign` string nullable
- `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`
- `referrerUrl` nullable
- `landingPath` nullable
- `creatorProfileId` nullable for creator-specific collector traffic
- `ownerUserId` nullable when the lead becomes a signed-up user
- `notes` text nullable
- `firstSeenAt`
- `lastSeenAt`
- `createdAt`
- `updatedAt`

Notes:

- this can represent both manually sourced creator leads and product-generated collector leads
- once a user account exists, connect `ownerUserId`

### 2. `LeadEvent`

Purpose: append-only timeline for funnel activity.

Recommended fields:

- `id`
- `leadId`
- `eventName`
- `eventValue` nullable string
- `metadata` JSON
- `occurredAt`

Use this for both CRM events and product events.

### 3. `AttributionSession`

Purpose: preserve first-touch and latest-touch attribution before login.

Recommended fields:

- `id`
- `anonymousId` unique
- `leadId` nullable
- `firstPath`
- `lastPath`
- `referrerUrl` nullable
- `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`
- `creatorProfileId` nullable
- `entryPageType` enum: `HOME`, `CREATOR_PAGE`, `BROWSE`, `OTHER`
- `createdAt`
- `updatedAt`

This record should be keyed off a cookie, then linked to the user or lead later.

### 4. Optional: `SignupIntent`

If you want sharper reporting without overloading generic events, add a focused table for signup milestones.

Recommended fields:

- `id`
- `userId` nullable
- `leadId` nullable
- `anonymousId`
- `intent` enum: `CREATOR`, `COLLECTOR`
- `creatorProfileId` nullable
- `startedAt`
- `completedAt` nullable
- `abandonedAt` nullable

This is optional because `LeadEvent` can cover the same information.

## Event taxonomy

Start with a small controlled set.

### Public traffic events

- `page_view_home`
- `page_view_creator`
- `cta_click_signup`
- `cta_click_subscribe_creator`
- `cta_click_browse_releases`

### Auth and signup events

- `auth_signin_started`
- `auth_magic_link_sent`
- `auth_completed`
- `role_selected_creator`
- `role_selected_collector`

### Collector activation events

- `collector_setup_started`
- `collector_setup_completed`
- `creator_subscription_started`
- `creator_subscription_completed`
- `release_selected`
- `pricing_viewed`
- `checkout_ready`
- `checkout_completed`

### Creator activation events

- `creator_setup_started`
- `creator_setup_completed`
- `creator_profile_published`
- `creator_release_published`
- `creator_shared_link_recorded`

### Outreach / CRM events

- `lead_created`
- `lead_contacted`
- `lead_replied`
- `lead_qualified`
- `lead_disqualified`

## Attribution design

### First-touch capture

On every public page request in `apps/mvp`:

1. read UTM params and optional creator referral params from the URL
2. upsert an `AttributionSession` using an `anon_id` cookie
3. store:
   - first path
   - last path
   - referrer
   - UTM values
   - creator slug or `creatorProfileId` when on a creator page

### Auth handoff

When the user signs in or signs up:

1. read the `anon_id` cookie
2. attach the matching `AttributionSession` to a `Lead` and then to `User`
3. write `auth_completed`
4. mark the lead `SIGNED_UP`

### Creator attribution

Every creator should share URLs that look like this:

```text
/creators/:slug?utm_source=instagram&utm_medium=story&utm_campaign=pilot_drop&ref_creator=:slug
```

Keep the parameters simple and explicit. For founder outreach, use different UTM values like `utm_source=founder_outbound`.

## Minimal implementation plan inside `apps/mvp`

### Step 1. Add attribution capture middleware or server utility

Create a shared utility that:

- reads `utm_*`, `ref_creator`, and request referrer
- ensures an `anon_id` cookie exists
- records first-touch and last-touch data

Good fit:

- middleware for cookie management and request decoration
- server-side helper used in public pages and auth callbacks for persistence

### Step 2. Add a small event logging service

Create `lib/analytics.ts` in `apps/mvp` with helpers like:

- `trackAnonymousEvent()`
- `trackUserEvent()`
- `identifyLeadFromSignup()`

Keep this server-first. Client-side tracking can be added only for button clicks that are otherwise invisible to the server.

### Step 3. Instrument the current funnel

Instrument these paths first:

- `/` public home page
- `/creators/[slug]`
- `/creators/[slug]/subscribe`
- `/auth/sign-in`
- `/auth/sign-up`
- `/onboarding`
- `/collector/setup`
- `subscribeToCreator()` in `lib/actions/collector.ts`
- release selection actions in `lib/actions/collector.ts`
- `/collector/pricing`
- `/collector/checkout`

### Step 4. Create creator share links

Add a simple section in `/creator/share` that generates tagged URLs for:

- Instagram bio
- Instagram story
- DeviantArt
- Discord
- direct DM

The creator should not need to know what UTM means.

### Step 5. Add an admin reporting page

Add a basic internal page in `apps/mvp` for:

- leads by source and status
- collector funnel conversion by creator
- creator funnel conversion by outreach source
- top creators by visitor-to-subscription conversion

Do not overbuild this. A table-based admin page is enough.

## Dashboard views to build first

### View 1. Creator acquisition dashboard

Columns:

- creator lead
- source
- contacted
- replied
- signed up
- profile published
- release published
- visitors generated
- collector signups generated
- collector subscriptions generated

### View 2. Collector acquisition dashboard

Columns:

- source
- creator
- anonymous visits
- auth completed
- collector setup completed
- creator subscriptions completed
- release selection rate
- pricing view rate

### View 3. Weekly funnel report

Metrics:

- total creator page visitors
- total collector signups
- signup conversion by creator
- setup completion rate
- subscribe completion rate
- top 5 source and creator combinations

## Recommended operating cadence

### Weekly growth review

Every week review:

- top-performing creators by visit-to-subscribe conversion
- sources producing low-quality signups
- friction points in collector setup and subscribe flow
- creator activation blockers

Use one decision rule each week:

- if traffic is weak, improve creator recruitment and creator sharing
- if signups are weak, improve public page messaging and CTA clarity
- if setup completion is weak, improve onboarding flow
- if subscriptions are weak, improve the post-auth redirect and creator context

## Fast experiments to run after instrumentation

### Experiment 1. Creator page CTA copy

Test:

- `Subscribe`
- `Get this creator in print`
- `Start your booklet with this creator`

Success metric:

- click-through to subscribe flow

### Experiment 2. Creator launch copy

Test creator-facing launch templates emphasizing:

- collectible physical object
- recurring support
- curated release experience

Success metric:

- creator page visit-to-signup rate

### Experiment 3. Post-auth continuity

Ensure users coming from a creator page always return to that creator context after auth and collector setup.

Success metric:

- signup-to-subscription completion rate

### Experiment 4. Shipping-country friction

Measure drop-off at collector setup by country.

Success metric:

- collector setup completion rate
- supported-country mix

## Immediate repo-level recommendations

### Product

- replace placeholder sign-up page with a real entry flow or redirect to sign-in with explicit context preservation
- preserve creator context through auth and collector setup using callback params or session state
- add source-aware creator share links in `/creator/share`

### Data

- add `Lead`, `LeadEvent`, and `AttributionSession` to Prisma
- store first-touch and latest-touch attribution
- treat the database as source of truth

### Reporting

- build one admin report before adding more channels
- review funnel metrics weekly

## What not to do yet

- do not buy traffic broadly
- do not build a complex marketing automation stack first
- do not use vanity metrics like raw pageviews as the main success metric
- do not split effort equally across creators and collectors; supply-side activation should lead

## Success criteria for the MVP GTM system

You should consider the MVP GTM system working when you can answer these questions from data without manual reconstruction:

- which creator generated a signup?
- which channel generated that signup?
- how many signups completed collector setup?
- how many setup-complete users subscribed to a creator?
- which creators produce the highest-quality collectors?
- which outreach sources produce creators who actually publish and share?

If those answers are visible, you will have enough signal to decide the next GTM investment.
