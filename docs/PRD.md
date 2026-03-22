
**Overview and Vision**
## Name candidates
- Booklet drop

Deliver a new way for fans of digital art creators to experience the work: artist-curated, high-quality printed booklet shipments that arrive on a recurring cadence. The initial audience is followers who already engage with creators on Instagram, Civitai, and similar platforms, but mostly consume that art in ephemeral digital feeds. Artists bring an existing audience; the platform turns that audience into a premium physical subscription experience without requiring the artist to manage print production or shipping.
Problem: fans currently support creators through digital memberships, tips, platform-native mechanics, commissions, or one-off merch, but these channels rarely create a lasting, collectible experience. For creators, monetization is fragmented and often tied to platform algorithms, payout mechanics, or audience volatility. There is an opportunity to create a more durable product for fans and a more diversified revenue stream for artists.
Vision: become the subscription layer for creator-led physical art experiences, starting with booklet-based drops inspired by premium softcover art books and zines. The default product is artist-curated rather than fan-assembled, because the primary value proposition is discovery, curation, and a recurring ritual, not a generic print store. Limited-edition or closed drops can amplify urgency and collectibility, but remain a secondary feature rather than the core reason to subscribe.

**Target Audience and Personas**
- Follower-Collector (Digital Art Fan)
Needs: a tangible way to revisit art they already love; a premium artifact that feels worth keeping; consistent print quality; simple subscription controls; a sense that the creator meaningfully curated the issue.
Scenario: discovers a creator's booklet subscription from a link in bio, subscribes to receive a monthly or bi-monthly issue, gets a curated booklet with artwork plus optional notes/process context, and keeps each issue as part of a growing personal collection.
- Creator with an Existing Audience (Digital Illustrator / AI creator / concept artist / tattoo flash artist)
Needs: diversify revenue beyond tips, memberships, Buzz, commissions, or marketplace mechanics; minimal operations overhead; clear issue deadlines; control over visual presentation; reliable third-party fulfillment that will not damage reputation.
Scenario: curates a booklet from existing catalog work plus new pieces, uploads a print-ready issue, optionally adds commentary or theming, promotes the drop to followers, and receives payouts without handling inventory, packaging, or shipping.
- Superfan / Completionist
Needs: collecting incentives, issue continuity, occasional limited runs, archive access, and confidence that missing a drop means missing part of a broader set.
Scenario: stays subscribed to avoid gaps in a creator's run, values issue numbering and shelf presence, and occasionally upgrades when a special edition or themed drop appears.
- Operations Partner (Print/Fulfillment)
Needs: standardized booklet specs, batchable production, region-aware shipping, predictable cutoffs, and clear exception handling for defects or late delivery.
Scenario: receives batched orders for an issue cycle, prints softcover booklets using supported formats, ships across approved regions, returns tracking updates, and supports reprints when quality issues occur.

**Functional Requirements (Features)**
Must-have
- Creator-led subscription pages: shareable landing page (link-in-bio ready), clear value prop, preview gallery, sample spreads, shipping regions, delivery cadence.
- Artist-curated subscription model: the default subscription experience is creator-curated, with research instrumentation to measure whether fan-selected variants are worth exploring later.
- Booklet-first product flow: templates/specs for premium softcover booklets, automatic preflight checks (bleed, DPI, margins), proof/preview generation, and initial support for core provider options such as page-count ranges, paper types, and booklet styling.
- Drop lifecycle & deadlines: monthly/bi-monthly cycle setup, cutoff dates, creator reminders, late/missed-drop handling policy (credit/skip/refund rules).
- Subscription commerce: recurring billing, pause/skip/cancel, address management, VAT/tax handling (esp. EU), failed-payment recovery.
- Fulfillment & tracking: order batching per drop, partner routing, shipment tracking, customer notifications, reprint workflow for defects/damage.
- Payouts: transparent revenue split, automated creator payouts, downloadable statements, refunds/chargebacks handling, and reporting that helps creators see this as a diversification channel separate from platform-native monetization.

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
- Build-your-own fully customized booklet per subscriber as the default product.
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
- H9 Back-catalog viability: creators can sustain drops by curating from an existing body of work, not just brand-new pieces every month.

**Scope (In and Out)**
- In scope for validation: EU pilot customers, creator-led booklet subscriptions, premium softcover booklet formats, third-party print-and-ship fulfillment, monthly or bi-monthly cadence, and research into collector appetite for curated versus self-selected art.
- Out of scope for validation: global launch pricing, full marketplace behavior, broad merchandise catalogs, creator site-building tools, and individualized per-subscriber booklet assembly.

**Open Questions: Shipping Costs & Regional Pricing**

*Background:* Print/delivery provider (Peecho) shipping costs range from €3–27 depending on destination country. This variance significantly impacts unit economics and subscription viability.

*Critical decision needed:*
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

*Next Steps:* Validate with unit economics model and fan interview pricing sensitivity data.
*Owner:* Product/Finance
*Timeline:* Before pilot definition (Week 3-4)

**Success Metrics**

**Technical Requirements and Constraints**

**User Experience (UX) Guidelines**

**Acceptance Criteria**
