# B2B Venue Channel — Exploration

**Status:** exploration / pre-validation
**Date:** 2026-07-02
**One-liner:** Sell curated monthly AI-art issues (magazine + rotating framed print) to hospitality venues — coffee shops, boutique hotels, co-working — as a "gallery-in-a-box" ambient experience that can also earn the venue money via covert print sales.

---

## 1. Why this channel is worth exploring

It attacks the two things that make the existing B2C collector model painful:

| Problem in B2C model                                                   | What the venue channel fixes                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ~€7+ shipping per single booklet to each home destroys margin          | Ship 3–10 copies to **one** address → shipping amortized across copies                       |
| Individual discretionary spend, price-sensitive (€2.34 margin/booklet) | Venue treats it as an **ambiance/marketing line item** (like plants, music licensing, decor) |
| High churn, one booklet at a time                                      | One venue account = recurring monthly order, predictable, stickier                           |
| Creator payouts too small to motivate (€37–175/mo)                     | Higher ACV per account → larger creator pool per sale                                        |

The channel isn't just a new audience; it repairs shipping economics and willingness-to-pay simultaneously.

## 2. The question that decides everything

**Will a venue actually pay for a magazine?** Most get trade mags free or customers bring their own; coffee-table books are bought once. Selling "a nice magazine" means competing with Monocle/Kinfolk/free local zines — and losing on price.

The offer must be something they can't get elsewhere and ideally **pays for itself**. Hence the reframe below.

## 3. The reframe: gallery-in-a-box, not a magazine

Sell a **rotating art experience** where the printed issue is the centerpiece but the system also:

- **Rotates fresh curated art monthly** — cover theme / "a feeling", appraised AI artists. Venue always looks curated with zero effort.
- **(Premium) Includes a rotating framed print** for the wall — the real dwell-time / Instagrammability driver.
- **Turns the magazine into a covert sales catalog** — discreet QR per spread → guest buys that print; **venue earns commission** on prints sold to their guests. Flips the magazine from a cost into a revenue-neutral-or-profit item, and reuses the existing Peecho print + creator-payout rails.

Positioning shifts from _"buy our magazine"_ → _"host a rotating gallery that delights guests and can earn you money."_ That's what makes a café say yes.

## 4. Target segments (tightest fit first)

1. **Specialty / third-wave coffee shops** — design-obsessed, already host local art, aesthetic is the product. **Beachhead.**
2. **Boutique hotels & premium Airbnbs** — coffee-table object + guest experience, on-brand, bigger budgets.
3. **Co-working spaces, design studios, salons/spas, upscale waiting rooms** — long dwell time, want to feel curated.
4. Restaurants/bars — dwell time yes, reading no. Lower fit.

## 5. Business model & unit economics (sketch)

Not per-booklet retail. Per-venue recurring:

- **Copies tier:** 5 copies of the monthly issue, bundled shipment → **€59–79/mo**
- **Gallery tier:** copies + rotating framed print → **€99–149/mo**
- **Print commission:** venue earns a cut on guest print purchases (pure upside)

Cost sketch (5 copies, 30pp): 5 × €6.50 ≈ €32.50 + one shipment ~€8 ≈ **~€41 cost** → margin **€18–60+/account/mo** vs €2.34 in B2C, before commission upside.

Open questions: annual vs monthly contract; who owns the QR-print relationship (platform bills guest, venue gets commission — reuses payout logic); framed-print logistics (Peecho does prints, framing/mounting is new).

## 6. Cheapest validation path (do this before building anything)

1. Produce **one physical sample issue** (pipeline already exists).
2. Walk into **10 specialty cafés** with it. Pitch gallery-in-a-box + QR-earnings. Ask directly: _"Would you pay €X/mo for this?"_
3. Target **≥3 paid pilot LOIs / prepaid first issues.**
4. If ≥3 say yes with money → build the B2B layer (venue accounts, multi-copy orders, bundled shipping, QR-to-buy, venue commission). If not → the channel isn't real yet; learn why.

## 7. Product/tech gaps if validated (not yet built)

- Venue account type (distinct from creator/collector) + multi-copy order line
- Bundled single-address shipping (Peecho quote for N copies to one address)
- QR-per-spread → print purchase flow attributing sale to a venue
- Venue commission ledger (extend existing `CreatorPayout` / `PayoutCalculation` model)
- Framed-print fulfillment path (new vs current booklet path)

---

**Next decision for the founder:** which thread to develop — (a) validation playbook + pitch script, (b) full pricing/commission model, (c) product/tech spec, (d) GTM/outreach (can the `lead-scraper` source venue leads?).
