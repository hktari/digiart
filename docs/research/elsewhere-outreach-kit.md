# ELSEWHERE — Artist Outreach Kit

**Use with:** [elsewhere-artist-program.md](./elsewhere-artist-program.md).
Copy-paste templates for getting consent to feature curated pieces in the demo issue —
which doubles as creator recruiting. Fill the `[brackets]`.

## Principles (why these work)

- **Curation-first, always name the specific piece.** "I saw *this exact image* and…"
  beats any mass blast. It flatters real taste and proves you're not a bot.
- **Lead with admiration, not the ask.** One genuine, specific sentence about *their*
  work before anything about us.
- **Be honest about stage.** "Free now, credited, rev-share once venues subscribe, you
  keep your rights, no exclusivity." Understating protects the whole moat. Never imply
  payment that isn't there yet.
- **Make "yes" one reply.** No forms, no calls required to say yes.
- **Short. Human. Signed by a real person.**

---

## Template 1 — First touch (DM: Instagram / X / Cara)

> Hi [name] — your [piece / "floating archipelago" one] stopped me mid-scroll. The
> [specific detail: light, the quiet of it] is exactly the feeling we're curating.
>
> I'm putting together **ELSEWHERE**, a small print magazine of imagined worlds for
> design-led cafés and hotels. I'd love to feature that piece — credited to you, with a
> link back.
>
> It's early and honest: the first issue is a demo, so it's unpaid, but you keep all
> your rights (non-exclusive), and contributing artists share revenue once venues start
> subscribing. Would you be open to it? Happy to send more detail.
>
> — [your name]

## Template 2 — First touch (email, when you have it)

> **Subject:** Featuring your work in ELSEWHERE (a print magazine of imagined worlds)
>
> Hi [name],
>
> I came across your [piece] and haven't stopped thinking about it — [one specific,
> genuine line]. It's exactly the kind of world we're trying to put in front of people.
>
> I'm building **ELSEWHERE**: a monthly print magazine of imagined worlds —
> dreamscapes, impossible cities, unseen natural and cosmic wonders — made by named
> artists working with AI, placed on the tables of design-forward cafés, hotels and
> studios. The whole point is the opposite of the scrapey AI stuff: **every world is by
> a named artist who chose to be there.**
>
> I'd love to feature **[piece]** in Issue 01, credited to you with a link. Being
> straight about where we are:
>
> - **The first issue is a demo — unpaid.** We do all the curation, print-prep and
>   layout.
> - **You keep everything.** Non-exclusive, print + promo use of that one piece only;
>   you keep copyright and can use it anywhere.
> - **Revenue-share once venues subscribe** — contributors share in it (and in print
>   sales) as real revenue comes in.
> - **First access** to our creator platform (subscriptions + print sales) as it opens.
>
> If you're open to it, just reply "yes" and, if you have it, the highest-resolution
> version you're happy to share. Either way — real admiration for the work.
>
> [your name]
> [link to a one-pager / ELSEWHERE site]

## Template 3 — Gentle follow-up (once, ~5–7 days later)

> Hi [name] — just floating this back up in case it slipped by. Still would love to
> feature [piece] in ELSEWHERE Issue 01, credited. No worries at all if it's not for
> you. 🙏

## Template 4 — The "yes" reply (capture consent + file + set expectations)

> Amazing — thank you! Three quick things and you're set:
>
> 1. **Confirming you're OK with:** featuring **[piece]** in ELSEWHERE Issue 01,
>    credited as **[how they want to be credited]** with a link to **[their link]** —
>    non-exclusive print + promotional use of that piece, you keep copyright, rev-share
>    once venues subscribe. A simple "confirmed" works.
> 2. **Highest-res file** you're happy to share (we upscale for print, so bigger is
>    better — but whatever you have is fine).
> 3. **One line about the world** — what is it, where is it? We'll draft a "field note"
>    and run it by you.
>
> I'll add you to the contributor list and keep you posted as we get it into venues.

---

## Consent record (log every yes)

Keep one row per featured piece — ethics *and* legal cover:

| Artist | Handle / email | Piece | Where reached | Consent (date) | Credit as | Link | Rev-share opt-in | Hi-res file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Tracking the outreach funnel

- Log every send, reply, and yes (a sheet is fine to start).
- Mirror it as PostHog events so recruiting is measured like the other funnels:
  `artist_outreach_sent` → `artist_consented` → `artist_featured`.
- **Every "yes" → a creator lead:** add them to a Resend contact + the mvp CRM `Lead`
  model, tagged for a B2C-platform pitch later. Curation *is* the creator pipeline.

## Anti-patterns (don't)

- ❌ Mass identical DMs — kills the whole premise and reputation.
- ❌ Printing first, asking later — one "that's my art, I never agreed" post undoes the
  positioning publicly.
- ❌ Implying payment for the demo — be honest; the honesty is the brand.
- ❌ Claiming exclusivity or broad rights — you want a light, specific, revocable license.

---

## Fixed details — fill once, then per send only change `[name]` / `[piece]` / `[detail]`

Paste these into the templates so the only per-artist work is the specific-piece line.

| Slot | Value |
| --- | --- |
| **Sender** | Boštjan (sign DMs `— Boštjan`; email `Boštjan Kamnik`) |
| **One-liner** | *a monthly print magazine of imagined worlds — placed on the tables of design-led cafés, hotels and studios, where every world is by a named artist who chose to be there.* |
| **Link** | `[ELSEWHERE /creators or waitlist URL]?utm_source=dm&utm_medium=social&utm_campaign=cartographer` (reuse the UTM'd link; one-pager if/when it exists) |
| **Credit convention** | Name + link to their profile, listed in "The Cartographers" back matter |
| **Regions we curate** | I. Worldbuilding · II. Dreamscapes · III. Imagined Architecture (livable, never dystopian) · IV. Cosmic · V. Algorithmic Abstractions |
| **Honesty line (verbatim)** | *Free now, credited, rev-share once venues subscribe, you keep your rights, no exclusivity.* |

## Run sheet — how to actually work the list

This is the current unblock: with ~0 audience, artists come from **outbound**, not the feed
(see [[elsewhere-social-audience]]). Work the tracker top to bottom.

1. **Cap ~10 personalised sends/day** on a fresh account — more looks like spam and risks
   DM limits (Instagram/Threads especially). Space them out; never send two identical DMs.
2. **Every send: name the specific piece** and one genuine detail (Template 1/2). Then log
   it in the tracker immediately → stage `outreach_sent`, stamp the date.
3. **Follow up once**, 5–7 days later (Template 3). If silence after that, stop — mark
   `no_reply`. Don't chase.
4. **On "yes" → Template 4.** Capture the consent row: credit-as, their link, rev-share
   opt-in, hi-res file, and one line for the field note. Stage → `consented`.
5. **Every "yes" is a creator lead** — flag it for Resend + the mvp CRM `Lead`, tagged for
   the B2C pitch later. Curation *is* the creator pipeline.
6. **Weekly**, count sourced → sent → replied → consented → featured. That's the funnel —
   mirror it in PostHog (`artist_outreach_sent → artist_consented → artist_featured`).

## Tracker

Live tracking should live in the Prospects Airtable (`app1QOtINLEvz5kxP`), tagged
`artist-outreach`, so a "yes" can flow to Resend + CRM. That MCP is currently disconnected —
until it's back, use **`elsewhere-outreach-tracker.csv`** (same folder). Its columns map 1:1
to the consent record above and import cleanly into the Airtable table.
