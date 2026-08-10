# Lead scraper — Telegram HITL and status routing

**Date:** 2026-08-10
**Status:** Approved, ready for implementation planning

## Problem

The Telegram group is the only human↔agent channel for the lead operation, but it
is write-only: the scraper posts a daily summary and nothing else. Acting on a
lead means leaving Telegram for the `lead-scraper-web` UI. The group had also
become a single flat stream shared with the social-media generator, which is why
it read as spam.

Meanwhile every action a triage pass needs — draft outreach, mark contacted, mark
irrelevant, archive — already exists in `lead-scraper-web`, locked inside Express
route handlers.

## Goals

- Triage a day's leads end to end from Telegram, without opening the web UI.
- Separate HITL traffic from status traffic so neither buries the other.
- Keep the channel quiet enough to stay worth reading: 0–2 actionable cards on a
  typical day, never more than 10.

## Non-goals

- Automated sending of Reddit messages. Sending stays manual; the operator presses
  **Contacted** after sending. Automating Reddit DMs risks the account.
- Post scheduling or campaign analysis. Those are Zernio, driven on demand.
- Reviving `apps/social-media-generator`. It stays parked (disabled 2026-08-10).

## Target chat

Forum supergroup **PrintFeed**, `-1003966791760` (`is_forum: true`), with two
bot-facing topics:

| Topic | Carries |
| --- | --- |
| **Leads** | One actionable card per lead scoring ≥ 60 |
| **Status** | Daily digest, and run failures prefixed 🚨 |

`General` stays a human space the bot never writes to.

This replaces basic group `-4993243885`, which still exists and will keep
accepting messages if any `TELEGRAM_CHAT_ID` is left pointing at it.

The bot `@digiart_leadscraper_bot` is currently a plain `member`. That is enough
to post, edit its own messages, and answer callbacks. Creating topics needs admin
with `can_manage_topics`; if the bot is not promoted, topic IDs are supplied by
hand as env vars.

## Architecture

Two processes already exist and keep their roles. `lead-scraper-cron` runs at
06:00, posts, and exits. `lead-scraper-web` is persistent and gains the bot.

```
06:00  cron ──scrape/qualify/store──> Postgres
            └──cards──> Leads topic
            └──digest──> Status topic

button press  Telegram ──POST /telegram/webhook──> lead-scraper-web
                                                    └──> lead-actions ──> Postgres
                                                    └──> edit card in place
```

### New: `src/lib/lead-actions.ts`

The four operations, lifted out of the `server.ts` route bodies so the bot and the
HTTP routes share one implementation rather than the bot calling its own process
over HTTP.

```ts
draftOutreach(leadId: string): Promise<string>   // Fireworks LLM, existing prompt
markContacted(leadId: string, notes?: string): Promise<Lead>
markIrrelevant(leadId: string, reason?: string): Promise<Lead>
archiveLead(leadId: string, reason?: string): Promise<Lead>
```

Each resolves its own Prisma access and throws on unknown `leadId`. The existing
routes in `server.ts` become thin wrappers; their request/response shapes do not
change, so `web-ui` needs no edits.

### New: `src/bot/lead-bot.ts`

A grammy `Bot` exporting a configured instance plus `registerHandlers`. Callback
data is `<action>:<leadId>`, parsed defensively — unknown actions and malformed
data answer the callback with an error rather than throwing.

Actions: `draft`, `contacted`, `irrelevant`, `regenerate`. **Open on Reddit** is a
plain URL button pointing at `lead.postUrl` and generates no callback.

It links to Reddit rather than the web UI deliberately: `web-ui` is a single page
with no router, so no per-lead URL exists to link to — and Reddit is where the
operator goes next anyway, to send the message.

Mounted in `server.ts`:

```ts
app.post("/telegram/webhook", webhookCallback(bot, "express", {
  secretToken: config.TELEGRAM_WEBHOOK_SECRET,
}))
```

Local development uses `bot.start()` long polling instead, selected by config —
one bot definition, two transports.

#### Callback data

`<action>:<leadId>[:<cardMessageId>]`, within Telegram's 64-byte limit
(`contacted:` + a 25-char cuid + a message ID is ~43 bytes).

Buttons on the card itself omit the third field — the handler reads the card's ID
from `ctx.callbackQuery.message.message_id`. Buttons on a draft reply carry the
originating card's message ID explicitly, which is how **Contacted** on a draft
resolves the card above it. No schema change is needed to correlate the two.

### Changed: `src/notifiers/telegram-notifier.ts`

Keeps the HTML escaping introduced in PR #6. Gains:

- `message_thread_id` on every send, chosen per destination (`leads` | `status`).
- `sendLeadCard(lead)` — card text plus the inline keyboard.
- Existing `sendDailySummary` / `sendErrorAlert` route to `status`.

## Card format

```
[78] r/artbusiness
Etsy fees are eating my print margins
u/someartist · print_physical (high)

[ ✍ Draft outreach ] [ ✓ Contacted     ]
[ ✖ Irrelevant     ] [ ↗ Open on Reddit ]
```

`contacted` and `irrelevant` **edit the card in place** to record the outcome
(`✓ Contacted 10:32`) and remove its keyboard. The topic stays a flat list of
leads and their resolutions rather than a growing reply thread.

**Draft outreach** cannot complete inside Telegram's ~10s callback window because
the LLM call is slower. It answers the callback immediately, then posts the draft
as a reply in a `<pre>` block — one-tap copy on mobile — carrying a follow-up
keyboard `[✓ Contacted] [↺ Regenerate]`. The card itself stays actionable until
an action resolves it.

- **Regenerate** re-runs `draftOutreach` for the same lead and edits the draft
  reply in place with the new text, keeping the same keyboard. The LLM prompt is
  unchanged between attempts; variation comes from sampling temperature.
- **Contacted pressed on a draft reply** resolves the original card exactly as
  pressing it on the card would, and additionally strips the keyboard from the
  draft reply. Both messages end in a settled state, neither offering a stale
  button.

## Selection and idempotence

After `store`, the notify step selects leads where:

- `score >= LEAD_CARD_MIN_SCORE` (default 60), and
- `notifiedAt IS NULL`, and
- not `isIrrelevant`, not `archived`

ordered by score descending, limited to `LEAD_CARD_DAILY_CAP` (default 10).
`notifiedAt` is stamped once a card posts successfully.

Reusing the existing `Lead.notifiedAt` column as the idempotence key means a
retried or re-run scrape never re-cards a lead. Leads above the threshold that
the cap excluded are counted in the digest as "+N more ≥ 60" and remain
uncarded — `notifiedAt` stays null, so they surface on the next run.

## Error handling

- **Callbacks never throw into grammy.** An uncaught error makes Telegram retry
  the update, which would double-apply an action. Every handler catches, logs,
  and answers the callback with the failure.
- **Draft failure** replies "draft failed — try again or open on Reddit" and
  leaves the card actionable.
- **Unset topic IDs** degrade to sending with no `message_thread_id` (lands in
  General) rather than crashing the run.
- **Notification failures stay non-fatal** and are recorded in `state.errors`, per
  PR #6. Leads are committed before notify; a messaging problem must never fail a
  run.
- **Webhook rejects** requests without the matching secret token.

## Configuration

Added to the zod schema in `src/utils/config.ts`. Both Railway services need the
chat and topic values; only `lead-scraper-web` needs the webhook secret.

| Variable | Default | Notes |
| --- | --- | --- |
| `TELEGRAM_CHAT_ID` | — | Repoint to `-1003966791760` |
| `TELEGRAM_TOPIC_LEADS` | — | Thread ID for cards |
| `TELEGRAM_TOPIC_STATUS` | — | Thread ID for digest and errors |
| `TELEGRAM_WEBHOOK_SECRET` | — | `lead-scraper-web` only |
| `LEAD_CARD_MIN_SCORE` | `60` | |
| `LEAD_CARD_DAILY_CAP` | `10` | |

Topic variables are optional in the schema so an unconfigured deploy degrades
rather than failing to boot.

## Testing

Vitest, matching the existing `apps/lead-scraper/tests` setup. No live Telegram
and no network in CI.

- **Card formatting** — extends the PR #6 escaping suite; HTML-reserved characters
  in titles and authors, keyboard structure, edited-card text.
- **Selection logic** — threshold, cap, ordering, and the idempotence rule: a lead
  with `notifiedAt` set is never re-carded.
- **`lead-actions`** — against a mocked Prisma client, including unknown-`leadId`
  errors.
- **Bot handlers** — driven through `bot.handleUpdate()` with synthetic
  `callback_query` updates and a stubbed API. Covers malformed callback data,
  unknown actions, and the failure path answering rather than throwing.

`tests/database-service.test.ts` needs a live `DATABASE_URL` and continues to fail
locally without one. That is pre-existing and out of scope.

## Cleanup included

`scripts/draft-outreach.ts` is deleted. It is a stale templated copy superseded by
the LLM route, and it derives the username by matching `/u/([^/]+)` against
`postUrl` — a pattern Reddit post URLs never contain, so every draft it produced
fell back to "Hey there," despite `Lead.author` being present.

## Operator setup

1. Create the **Leads** and **Status** topics; record both thread IDs. Or promote
   the bot to admin with *Manage Topics*.
2. Set `TELEGRAM_CHAT_ID=-1003966791760` on `lead-scraper-cron`,
   `lead-scraper-web`, and local `.env`.
3. Set the topic IDs on both services; set `TELEGRAM_WEBHOOK_SECRET` on
   `lead-scraper-web`.
4. Register the webhook once against the `lead-scraper-web` domain, via the setup
   script added with this work.
