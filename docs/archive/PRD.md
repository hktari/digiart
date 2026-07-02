**Overview and Vision**

## Name candidates

- Booklet drop

Deliver a new way for people who love digital art to experience the work: release-led, high-quality printed booklets that arrive on a recurring cadence. The initial audience is followers who already engage with artists on Instagram, Civitai, and similar platforms, but mostly consume that art in ephemeral digital feeds. A single platform account should let someone publish releases, earn payouts, follow other artists, and build their own booklet from selected releases without maintaining separate account types.
Problem: digital art fans currently support artists through memberships, tips, platform-native mechanics, commissions, or one-off merch, but these channels rarely create a lasting, collectible experience. For artists, monetization is fragmented and often tied to platform algorithms, opaque payout mechanics, or audience volatility. There is an opportunity to create a more durable product for fans and a more diversified revenue stream for artists, while making booklet pricing and payout logic legible instead of hidden.
Vision: become the subscription layer for release-led physical art experiences, starting with booklet-based drops inspired by premium softcover art books and zines. The core interaction is selecting complete releases rather than handpicking individual artworks one by one, because the primary value proposition is curation, storytelling, and a recurring ritual, not a generic print store. Limited-edition or closed drops can amplify urgency and collectibility, but remain a secondary feature rather than the core reason to subscribe.

**Target Audience and Personas**

- Art Lover / Subscriber
  Needs: a tangible way to revisit art they already love; a premium artifact that feels worth keeping; consistent print quality; simple booklet controls; transparent pricing so they can see what they are paying for.
  Scenario (passive): subscribes to one or more artists, lets the platform auto-populate their booklet with new releases each month, and receives a curated physical artifact on the cycle lock date without any extra steps.
  Scenario (active): discovers a release mid-cycle, curates their selection, sees a clear breakdown of printing, shipping, tax, and platform take, clicks "Order Now" to receive their booklet sooner without waiting for the cycle lock.
- Artist with an Existing Audience (Digital Illustrator / AI creator / concept artist / tattoo flash artist)
  Needs: diversify revenue beyond tips, memberships, Buzz, commissions, or marketplace mechanics; minimal operations overhead; clear release deadlines; control over visual presentation; transparent payout reporting; reliable third-party fulfillment that will not damage reputation.
  Scenario: assembles a release from existing catalog work plus new pieces, optionally adds commentary or theming, publishes it for the active cycle, promotes it to followers, and sees exactly how supporter spend converts into payouts without handling inventory, packaging, or shipping.
- Superfan / Completionist
  Needs: collecting incentives, issue continuity, occasional limited runs, archive access, and confidence that missing a drop means missing part of a broader set.
  Scenario: stays subscribed to avoid gaps in a creator's run, values issue numbering and shelf presence, and occasionally upgrades when a special edition or themed drop appears.
- Operations Partner (Print/Fulfillment)
  Needs: standardized booklet specs, batchable production, region-aware shipping, predictable cutoffs, and clear exception handling for defects or late delivery.
  Scenario: receives batched orders for an issue cycle, prints softcover booklets using supported formats, ships across approved regions, returns tracking updates, and supports reprints when quality issues occur.

**Functional Requirements (Features)**
Must-have

- Release-led artist pages: shareable landing page (link-in-bio ready), clear value prop, preview gallery, sample spreads, shipping regions, delivery cadence, and current releases.
- Unified account model: one account can publish releases, earn payouts, and assemble personal booklets; role/capability differences should not feel like separate products.
- Booklet-first product flow: templates/specs for premium softcover booklets, automatic preflight checks (bleed, DPI, margins), proof/preview generation, and initial support for core provider options such as page-count ranges, paper types, and booklet styling.
- Release-based booklet assembly: users build booklets by selecting complete releases rather than selecting artworks one by one.
- Drop lifecycle & deadlines: monthly/bi-monthly cycle setup, cutoff dates, creator reminders, late/missed-drop handling policy (credit/skip/refund rules).
- Subscription commerce: recurring billing, pause/skip/cancel, address management, VAT/tax handling (esp. EU), failed-payment recovery.
- Fulfillment & tracking: order batching per drop, partner routing, shipment tracking, customer notifications, reprint workflow for defects/damage.
- Payouts: transparent revenue split, automated creator payouts, downloadable statements, refunds/chargebacks handling, and reporting that helps artists see exactly how booklet revenue is calculated.
- Pricing transparency: each booklet order shows a clear cost breakdown for product, shipping, tax, platform fee, and creator payout contribution before checkout.

Should-have

- Format research + expansion path: lightweight preference capture for format, binding, paper feel, and cadence; A/B testing booklet options; capability to add posters/prints later.
- Limited edition as a modifier (not core): optional “closed edition” toggles, caps per drop, waitlists, fairness rules (time window vs quantity), anti-bot basics.
- Fan experience enhancements: creator notes/liner text, issue numbering, archive library for subscribers, gifting, and thematic issue packaging that reinforces the sense of a recurring collectible artifact.
- Creator marketing helpers: referral links/UTM tracking, promo codes, launch reminders, basic analytics (conversion, churn, cohort by drop).

Could-have

- Integrations: optional connect/share flows for Instagram link hub, Civitai/community embedding, Discord role gating for subscribers, and signals that help creators convert existing audiences.
- Community layer: polls for next issue theme, behind-the-scenes content, collector badges.
- Personalization layers that do not break batch printing, such as theme voting, artist notes, or subscriber-access archives.

Won’t-have (initial release)

- Full creator website builder (ArtSpan-style) as the primary product.
- General-purpose POD marketplace optimized for one-off sales.
- Build-your-own fully customized booklet by selecting individual artworks as the default product.
- Scarcity/limited editions as the main positioning (kept as an occasional lever, not the headline value).

**Validation Hypotheses**

- H1 Demand: followers want a physical, kept experience instead of only consuming art in feeds.
- H2 Willingness to pay: followers will pay a recurring fee plus shipping for a printed booklet drop.
- H3 Creator supply: creators can reliably produce booklet-ready drops on a recurring cadence and will promote them.
- H4 Format fit: booklet is the strongest first format versus posters, sticker packs, postcard sets, or generic merch.
- H5 Experience: limited/closed editions add excitement but are not required for baseline adoption.
- H6 Fulfillment trust: third-party print and shipping is acceptable if quality and reliability are strong.
- H7 Creator diversification: creators want revenue not tied to Civitai, Buzz, platform payouts, or algorithmic mechanics.
- H8 Physical premium: fans will pay more for a curated physical booklet than for digital-only perks.
- H9 Back-catalog viability: artists can sustain drops by curating from an existing body of work, not just brand-new pieces every month.
- H10 Transparency: clearer pricing and payout breakdowns increase trust and conversion for both buyers and artists.

**Scope (In and Out)**

- In scope for validation: EU pilot customers, release-led booklet subscriptions, premium softcover booklet formats, third-party print-and-ship fulfillment, monthly or bi-monthly cadence, transparent pricing/payout reporting, and research into appetite for release selection versus artwork-level selection.
- Out of scope for validation: global launch pricing, full marketplace behavior, broad merchandise catalogs, creator site-building tools, and individualized per-subscriber booklet assembly.

**Open Questions: Shipping Costs & Regional Pricing**

_Background:_ Print/delivery provider (Peecho) shipping costs range from €3–27 depending on destination country. This variance significantly impacts unit economics and subscription viability.

_Critical decision needed:_

1. **Pricing Strategy**: One global price vs. regional pricing tiers?
   - Option A: Single price (absorb variance, simpler marketing, higher margin risk in expensive regions)
   - Option B: Tiered pricing by region (aligned with costs, complex to communicate, potentially deters higher-cost regions)

2. **Pilot Market Scope**: Given €3–27 variance, which regions to include?
   - Tier 1: Core EU (€3–6 shipping) - lower-cost EU destinations where pricing is simplest and margins are most resilient.
   - Tier 2: Extended EU (€7–10) - higher-cost EU destinations that may still work with slightly different pricing or lower margin.
   - Tier 3: UK/Europe non-EU (€11–16) - UK, Norway, Switzerland, etc.
   - Tier 4: North America (€17–22) - USA, Canada
   - Tier 5: Asia-Pacific (€23–27) - Japan, Australia, etc.

3. **Margin Impact**: Can target margins absorb €24 swings? If not, Tier 4-5 likely pilot-exclude.

4. **Product Experience Risk**: Do collectors prefer artist-curated issues strongly enough to keep the product differentiated, or does demand shift toward fan-selected art?

5. **Catalog Sustainability**: How much of each issue can come from curated back-catalog work versus net-new content before perceived value drops?

_Next Steps:_ Validate with unit economics model and fan interview pricing sensitivity data.
_Owner:_ Product/Finance
_Timeline:_ Before pilot definition (Week 3-4)

**Success Metrics**

**Technical Requirements and Constraints**

**User Experience (UX) Guidelines**

**Acceptance Criteria**
