# Lead Scraper Telegram HITL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator triage a day's Reddit leads entirely from the PrintFeed Telegram supergroup — draft outreach, mark contacted, mark irrelevant — instead of opening the web UI.

**Architecture:** The 06:00 `lead-scraper-cron` posts one actionable card per lead scoring ≥ 60 into the Leads topic and the digest into the Status topic, then exits. Button presses arrive as Telegram callback queries at a grammy webhook mounted inside the already-persistent `lead-scraper-web`, which applies them through a shared `lead-actions` module and edits the card in place.

**Tech Stack:** TypeScript, tsx (no build step), grammy 1.43, Prisma 5.22, Express, Vitest, Fireworks AI via LangChain.

**Spec:** `docs/superpowers/specs/2026-08-10-lead-scraper-telegram-hitl-design.md`

## Global Constraints

- Package manager is `pnpm`. Run app scripts as `pnpm --filter lead-scraper <script>`.
- Format and lint with Biome: `pnpm --filter lead-scraper exec biome check --write <files>`. 2-space indent.
- Tests are Vitest, non-interactive, in `apps/lead-scraper/tests/`, named `*.test.ts`.
- **No Prisma schema changes.** Correlation uses existing columns only (`Lead.notifiedAt`).
- Every new env var is optional or defaulted — adding a required one would break the running cron on next deploy.
- All Telegram messages use `parse_mode: "HTML"` and escape interpolated values with the notifier's `escapeHtml`. Never Markdown.
- Callback handlers must never throw; an uncaught error makes Telegram retry and double-apply the action.
- `tests/database-service.test.ts` fails without a live `DATABASE_URL`. That is pre-existing — ignore it, do not fix it.
- Target chat is `-1003966791760`. Status topic is thread `7`. The Leads topic ID is **not yet created**; treat `TELEGRAM_TOPIC_LEADS` as unset-tolerant everywhere.

---

### Task 1: Add Telegram topic and lead-card configuration

**Files:**
- Modify: `apps/lead-scraper/src/utils/config.ts:3-12`
- Test: `apps/lead-scraper/tests/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Config` gains `TELEGRAM_TOPIC_LEADS?: number`, `TELEGRAM_TOPIC_STATUS?: number`, `TELEGRAM_WEBHOOK_SECRET?: string`, `LEAD_CARD_MIN_SCORE: number` (default 60), `LEAD_CARD_DAILY_CAP: number` (default 10).

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/config.test.ts
import { describe, expect, it } from "vitest";
import { ConfigSchema } from "../src/utils/config.js";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  FIREWORKS_API_KEY: "fw_test",
  TELEGRAM_BOT_TOKEN: "123:abc",
  TELEGRAM_CHAT_ID: "-1003966791760",
};

describe("ConfigSchema", () => {
  it("defaults the card threshold and cap", () => {
    const config = ConfigSchema.parse(base);
    expect(config.LEAD_CARD_MIN_SCORE).toBe(60);
    expect(config.LEAD_CARD_DAILY_CAP).toBe(10);
  });

  it("leaves topic IDs undefined when unset", () => {
    const config = ConfigSchema.parse(base);
    expect(config.TELEGRAM_TOPIC_LEADS).toBeUndefined();
    expect(config.TELEGRAM_TOPIC_STATUS).toBeUndefined();
  });

  it("coerces topic IDs from env strings to numbers", () => {
    const config = ConfigSchema.parse({
      ...base,
      TELEGRAM_TOPIC_LEADS: "12",
      TELEGRAM_TOPIC_STATUS: "7",
    });
    expect(config.TELEGRAM_TOPIC_LEADS).toBe(12);
    expect(config.TELEGRAM_TOPIC_STATUS).toBe(7);
  });

  it("rejects a non-numeric topic ID", () => {
    expect(() =>
      ConfigSchema.parse({ ...base, TELEGRAM_TOPIC_STATUS: "General" }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/config.test.ts`
Expected: FAIL — `ConfigSchema` is not exported.

- [ ] **Step 3: Write minimal implementation**

Export the schema (it is currently a module-private `const`) and add the fields:

```ts
// apps/lead-scraper/src/utils/config.ts
export const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  FIREWORKS_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),

  // Forum topic thread IDs. Optional: an unconfigured deploy posts to the
  // group's General topic rather than failing to boot.
  TELEGRAM_TOPIC_LEADS: z.coerce.number().int().positive().optional(),
  TELEGRAM_TOPIC_STATUS: z.coerce.number().int().positive().optional(),

  // Only lead-scraper-web needs this; the cron never serves the webhook.
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),

  LEAD_CARD_MIN_SCORE: z.coerce.number().int().default(60),
  LEAD_CARD_DAILY_CAP: z.coerce.number().int().positive().default(10),

  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});
```

Leave `loadConfig` and `SUBREDDITS` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/config.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Format, typecheck, commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/utils/config.ts tests/config.test.ts
pnpm --filter lead-scraper typecheck
git add apps/lead-scraper/src/utils/config.ts apps/lead-scraper/tests/config.test.ts
git commit -m "Add Telegram topic and lead card config"
```

---

### Task 2: Extract lead actions out of the Express routes

**Files:**
- Create: `apps/lead-scraper/src/lib/lead-actions.ts`
- Modify: `apps/lead-scraper/src/web/server.ts` (routes at lines 199, 221, 266, 309)
- Test: `apps/lead-scraper/tests/lead-actions.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `markContacted(prisma: PrismaClient, leadId: string, notes?: string): Promise<Lead>`
  - `markIrrelevant(prisma: PrismaClient, leadId: string, reason?: string): Promise<Lead>`
  - `archiveLead(prisma: PrismaClient, leadId: string, reason?: string): Promise<Lead>`
  - `draftOutreach(prisma: PrismaClient, leadId: string, apiKey: string): Promise<string>`
  - `LeadNotFoundError` (extends `Error`)

Prisma is passed in rather than imported so tests can supply a stub and the bot can share the web server's client.

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/lead-actions.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  LeadNotFoundError,
  archiveLead,
  markContacted,
  markIrrelevant,
} from "../src/lib/lead-actions.js";

function stubPrisma(lead: unknown) {
  return {
    lead: {
      findUnique: vi.fn().mockResolvedValue(lead),
      update: vi.fn().mockImplementation(({ data }) => ({ id: "l1", ...data })),
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal Prisma stub
  } as any;
}

describe("markContacted", () => {
  it("sets reachedOut and a timestamp", async () => {
    const prisma = stubPrisma({ id: "l1" });
    const result = await markContacted(prisma, "l1", "sent DM");

    expect(result.reachedOut).toBe(true);
    expect(result.reachedOutAt).toBeInstanceOf(Date);
    expect(result.outreachNotes).toBe("sent DM");
  });

  it("stores null notes when none given", async () => {
    const prisma = stubPrisma({ id: "l1" });
    const result = await markContacted(prisma, "l1");
    expect(result.outreachNotes).toBeNull();
  });

  it("throws LeadNotFoundError for an unknown id", async () => {
    const prisma = stubPrisma(null);
    await expect(markContacted(prisma, "nope")).rejects.toBeInstanceOf(
      LeadNotFoundError,
    );
  });
});

describe("markIrrelevant", () => {
  it("sets the irrelevance fields and attributes them to the user", async () => {
    const prisma = stubPrisma({ id: "l1" });
    const result = await markIrrelevant(prisma, "l1", "not an artist");

    expect(result.isIrrelevant).toBe(true);
    expect(result.irrelevanceReason).toBe("not an artist");
    expect(result.markedIrrelevantBy).toBe("user");
    expect(result.markedIrrelevantAt).toBeInstanceOf(Date);
  });
});

describe("archiveLead", () => {
  it("soft deletes with a timestamp", async () => {
    const prisma = stubPrisma({ id: "l1" });
    const result = await archiveLead(prisma, "l1");

    expect(result.archived).toBe(true);
    expect(result.archivedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-actions.test.ts`
Expected: FAIL — cannot resolve `../src/lib/lead-actions.js`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/lead-scraper/src/lib/lead-actions.ts`. Move the LLM prompt verbatim from the existing `server.ts` `/api/leads/:id/draft-outreach` handler — do not reword it, the copy is tuned.

```ts
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import type { Lead, PrismaClient } from "@prisma/client";

export class LeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "LeadNotFoundError";
  }
}

const CREATORS_URL = "https://printfeed.btechhub.top/creators";

async function requireLead(prisma: PrismaClient, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { painPoints: true },
  });
  if (!lead) throw new LeadNotFoundError(leadId);
  return lead;
}

export async function markContacted(
  prisma: PrismaClient,
  leadId: string,
  notes?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: { reachedOut: true, reachedOutAt: new Date(), outreachNotes: notes ?? null },
  });
}

export async function markIrrelevant(
  prisma: PrismaClient,
  leadId: string,
  reason?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      isIrrelevant: true,
      irrelevanceReason: reason ?? null,
      markedIrrelevantAt: new Date(),
      markedIrrelevantBy: "user",
    },
  });
}

export async function archiveLead(
  prisma: PrismaClient,
  leadId: string,
  reason?: string,
): Promise<Lead> {
  await requireLead(prisma, leadId);
  return prisma.lead.update({
    where: { id: leadId },
    data: { archived: true, archivedAt: new Date(), archiveReason: reason ?? null },
  });
}

export async function draftOutreach(
  prisma: PrismaClient,
  leadId: string,
  apiKey: string,
): Promise<string> {
  const lead = await requireLead(prisma, leadId);

  const painPointsSummary = lead.painPoints
    .map((pp) => `- ${pp.category} (${pp.severity}): ${pp.description}`)
    .join("\n");

  // Prompt copied verbatim from the previous server.ts route.
  const prompt = buildOutreachPrompt(lead, painPointsSummary, CREATORS_URL);

  const model = new ChatFireworks({
    model: "accounts/fireworks/models/minimax-m2p7",
    temperature: 0.7,
    apiKey,
  });
  const response = await model.invoke(prompt);
  return String(response.content).trim();
}
```

Define `buildOutreachPrompt` in the same file, pasting the template literal from the current `server.ts` handler unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-actions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Rewrite the four routes as thin wrappers**

In `server.ts`, replace each handler body with a call into the module. Keep every response shape and status code identical — `web-ui` depends on them. Example:

```ts
app.post("/api/leads/:id/contact", async (req, res) => {
  try {
    const lead = await markContacted(prisma, req.params.id, req.body.notes);
    res.json(lead);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      return res.status(404).json({ error: "Lead not found" });
    }
    console.error("Error marking lead as contacted:", error);
    res.status(500).json({ error: "Failed to mark lead as contacted" });
  }
});
```

Do the same for `/irrelevant`, `/archive`, and `/draft-outreach`. The draft route keeps its existing `FIREWORKS_API_KEY` guard returning 500 when unset.

- [ ] **Step 6: Verify nothing regressed**

Run: `pnpm --filter lead-scraper exec vitest run` and `pnpm --filter lead-scraper typecheck`
Expected: all suites pass except the pre-existing `database-service.test.ts`.

- [ ] **Step 7: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/lib/lead-actions.ts src/web/server.ts tests/lead-actions.test.ts
git add apps/lead-scraper/src/lib/lead-actions.ts apps/lead-scraper/src/web/server.ts apps/lead-scraper/tests/lead-actions.test.ts
git commit -m "Share lead actions between web routes and bot"
```

---

### Task 3: Encode and parse callback data

**Files:**
- Create: `apps/lead-scraper/src/bot/callback-data.ts`
- Test: `apps/lead-scraper/tests/callback-data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type CallbackAction = "draft" | "contacted" | "irrelevant" | "regenerate"`
  - `encodeCallback(action: CallbackAction, leadId: string, cardMessageId?: number): string`
  - `parseCallback(data: string): { action: CallbackAction; leadId: string; cardMessageId?: number } | null`

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/callback-data.test.ts
import { describe, expect, it } from "vitest";
import { encodeCallback, parseCallback } from "../src/bot/callback-data.js";

describe("callback data", () => {
  it("round-trips without a card message id", () => {
    const encoded = encodeCallback("draft", "clx123abc");
    expect(parseCallback(encoded)).toEqual({
      action: "draft",
      leadId: "clx123abc",
      cardMessageId: undefined,
    });
  });

  it("round-trips with a card message id", () => {
    const encoded = encodeCallback("contacted", "clx123abc", 4242);
    expect(parseCallback(encoded)).toEqual({
      action: "contacted",
      leadId: "clx123abc",
      cardMessageId: 4242,
    });
  });

  it("stays within Telegram's 64-byte callback_data limit", () => {
    const cuid = "c".repeat(25);
    const encoded = encodeCallback("regenerate", cuid, 9999999);
    expect(Buffer.byteLength(encoded, "utf8")).toBeLessThanOrEqual(64);
  });

  it.each([
    ["", "empty"],
    ["draft", "no lead id"],
    ["explode:clx1", "unknown action"],
    ["draft:", "blank lead id"],
    ["draft:clx1:notanumber", "bad message id"],
  ])("returns null for %s (%s)", (input) => {
    expect(parseCallback(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/callback-data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/lead-scraper/src/bot/callback-data.ts
export type CallbackAction = "draft" | "contacted" | "irrelevant" | "regenerate";

const ACTIONS: readonly CallbackAction[] = [
  "draft",
  "contacted",
  "irrelevant",
  "regenerate",
];

export interface ParsedCallback {
  action: CallbackAction;
  leadId: string;
  cardMessageId?: number;
}

export function encodeCallback(
  action: CallbackAction,
  leadId: string,
  cardMessageId?: number,
): string {
  return cardMessageId === undefined
    ? `${action}:${leadId}`
    : `${action}:${leadId}:${cardMessageId}`;
}

export function parseCallback(data: string): ParsedCallback | null {
  const parts = data.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const [action, leadId, rawMessageId] = parts;
  if (!ACTIONS.includes(action as CallbackAction)) return null;
  if (!leadId) return null;

  let cardMessageId: number | undefined;
  if (rawMessageId !== undefined) {
    cardMessageId = Number(rawMessageId);
    if (!Number.isInteger(cardMessageId)) return null;
  }

  return { action: action as CallbackAction, leadId, cardMessageId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/callback-data.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/bot/callback-data.ts tests/callback-data.test.ts
git add apps/lead-scraper/src/bot/callback-data.ts apps/lead-scraper/tests/callback-data.test.ts
git commit -m "Encode lead actions into Telegram callback data"
```

---

### Task 4: Format lead cards and their keyboards

**Files:**
- Create: `apps/lead-scraper/src/notifiers/lead-card.ts`
- Test: `apps/lead-scraper/tests/lead-card.test.ts`

**Interfaces:**
- Consumes: `encodeCallback` from Task 3.
- Produces:
  - `type CardLead = { id: string; score: number; subreddit: string; title: string; author: string; postUrl: string; painPoints: Array<{ category: string; severity: string }> }`
  - `formatCardText(lead: CardLead): string`
  - `buildCardKeyboard(lead: CardLead): InlineKeyboard`
  - `formatResolvedCardText(lead: CardLead, outcome: "contacted" | "irrelevant", at: Date): string`
  - `formatDraftReply(draft: string): string`
  - `buildDraftKeyboard(leadId: string, cardMessageId: number): InlineKeyboard`
  - `escapeHtml(text: string): string` — exported here and reused by the notifier

Move `escapeHtml` out of `TelegramNotifier` into this module so the bot can escape without instantiating a notifier. Task 5 updates the notifier to import it.

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/lead-card.test.ts
import { describe, expect, it } from "vitest";
import {
  buildCardKeyboard,
  formatCardText,
  formatDraftReply,
  formatResolvedCardText,
} from "../src/notifiers/lead-card.js";

const lead = {
  id: "clx1",
  score: 78,
  subreddit: "artbusiness",
  title: "Etsy fees & <margins> are killing me",
  author: "some_artist",
  postUrl: "https://www.reddit.com/r/artbusiness/comments/abc/etsy_fees/",
  painPoints: [{ category: "print_physical", severity: "high" }],
};

describe("formatCardText", () => {
  it("includes score, subreddit, author and top pain point", () => {
    const text = formatCardText(lead);
    expect(text).toContain("[78]");
    expect(text).toContain("r/artbusiness");
    expect(text).toContain("u/some_artist");
    expect(text).toContain("print_physical (high)");
  });

  it("escapes HTML-reserved characters in the title", () => {
    const text = formatCardText(lead);
    expect(text).toContain("Etsy fees &amp; &lt;margins&gt;");
    expect(text).not.toContain("<margins>");
  });

  it("renders without pain points", () => {
    const text = formatCardText({ ...lead, painPoints: [] });
    expect(text).toContain("[78]");
  });
});

describe("buildCardKeyboard", () => {
  it("offers three callback buttons and one Reddit URL button", () => {
    const rows = buildCardKeyboard(lead).inline_keyboard;
    const buttons = rows.flat();

    const callbacks = buttons.filter((b) => "callback_data" in b);
    const urls = buttons.filter((b) => "url" in b);

    expect(callbacks.map((b) => (b as { callback_data: string }).callback_data)).toEqual([
      "draft:clx1",
      "contacted:clx1",
      "irrelevant:clx1",
    ]);
    expect(urls).toHaveLength(1);
    expect((urls[0] as { url: string }).url).toBe(lead.postUrl);
  });
});

describe("formatResolvedCardText", () => {
  it("records the outcome and drops nothing from the original", () => {
    const text = formatResolvedCardText(lead, "contacted", new Date("2026-08-10T10:32:00Z"));
    expect(text).toContain("r/artbusiness");
    expect(text).toContain("Contacted");
  });
});

describe("formatDraftReply", () => {
  it("wraps the draft in a pre block and escapes it", () => {
    const text = formatDraftReply("hey <there> & welcome");
    expect(text).toContain("<pre>");
    expect(text).toContain("hey &lt;there&gt; &amp; welcome");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-card.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/lead-scraper/src/notifiers/lead-card.ts
import { InlineKeyboard } from "grammy";
import { encodeCallback } from "../bot/callback-data.js";

export interface CardLead {
  id: string;
  score: number;
  subreddit: string;
  title: string;
  author: string;
  postUrl: string;
  painPoints: Array<{ category: string; severity: string }>;
}

/** Telegram's HTML parse mode reserves only these three characters. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(title: string, max = 90): string {
  return title.length > max ? `${title.slice(0, max)}...` : title;
}

export function formatCardText(lead: CardLead): string {
  const top = lead.painPoints[0];
  const painLine = top
    ? `\n${escapeHtml(top.category)} (${escapeHtml(top.severity)})`
    : "";

  return `<b>[${lead.score}]</b> r/${escapeHtml(lead.subreddit)}
${escapeHtml(truncate(lead.title))}
u/${escapeHtml(lead.author)}${painLine}`;
}

export function buildCardKeyboard(lead: CardLead): InlineKeyboard {
  return new InlineKeyboard()
    .text("✍ Draft outreach", encodeCallback("draft", lead.id))
    .text("✓ Contacted", encodeCallback("contacted", lead.id))
    .row()
    .text("✖ Irrelevant", encodeCallback("irrelevant", lead.id))
    .url("↗ Open on Reddit", lead.postUrl);
}

function stamp(at: Date): string {
  return at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatResolvedCardText(
  lead: CardLead,
  outcome: "contacted" | "irrelevant",
  at: Date,
): string {
  const label = outcome === "contacted" ? "✓ Contacted" : "✖ Irrelevant";
  return `${formatCardText(lead)}\n\n<i>${label} ${stamp(at)}</i>`;
}

export function formatDraftReply(draft: string): string {
  return `<b>✍ Draft</b>\n<pre>${escapeHtml(draft)}</pre>`;
}

export function buildDraftKeyboard(
  leadId: string,
  cardMessageId: number,
): InlineKeyboard {
  return new InlineKeyboard()
    .text("✓ Contacted", encodeCallback("contacted", leadId, cardMessageId))
    .text("↺ Regenerate", encodeCallback("regenerate", leadId, cardMessageId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-card.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/notifiers/lead-card.ts tests/lead-card.test.ts
git add apps/lead-scraper/src/notifiers/lead-card.ts apps/lead-scraper/tests/lead-card.test.ts
git commit -m "Format Telegram lead cards and keyboards"
```

---

### Task 5: Route notifier messages to topics and send cards

**Files:**
- Modify: `apps/lead-scraper/src/notifiers/telegram-notifier.ts`
- Test: `apps/lead-scraper/tests/telegram-notifier.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: `CardLead`, `formatCardText`, `buildCardKeyboard`, `escapeHtml` from Task 4.
- Produces:
  - `new TelegramNotifier(botToken, chatId, topics?: { leads?: number; status?: number })`
  - `sendLeadCard(lead: CardLead): Promise<number>` — resolves to the sent message ID.
  - Existing `sendDailySummary` / `sendErrorAlert` now target the status topic.

- [ ] **Step 1: Write the failing test**

Append to `apps/lead-scraper/tests/telegram-notifier.test.ts`:

```ts
describe("topic routing", () => {
  it("sends the daily summary to the status topic", async () => {
    const { notifier, sent } = createNotifier({ leads: 12, status: 7 });
    await notifier.sendDailySummary([], stats);
    expect(sent[0].options.message_thread_id).toBe(7);
  });

  it("sends lead cards to the leads topic with a keyboard", async () => {
    const { notifier, sent } = createNotifier({ leads: 12, status: 7 });
    await notifier.sendLeadCard(cardLead);

    expect(sent[0].options.message_thread_id).toBe(12);
    expect(sent[0].options.reply_markup).toBeDefined();
  });

  it("omits the thread id entirely when topics are unconfigured", async () => {
    const { notifier, sent } = createNotifier();
    await notifier.sendDailySummary([], stats);
    expect(sent[0].options.message_thread_id).toBeUndefined();
  });
});
```

Update the existing `createNotifier` helper to accept an optional topics argument and to capture the full options object, and add a `cardLead` fixture matching `CardLead`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/telegram-notifier.test.ts`
Expected: FAIL — constructor takes no topics argument, `sendLeadCard` undefined.

- [ ] **Step 3: Write minimal implementation**

Add a `topics` field and a private helper that builds send options, then use it on every send:

```ts
constructor(
  botToken: string,
  chatId: string,
  private topics: { leads?: number; status?: number } = {},
) {
  this.bot = new Bot(botToken);
  this.chatId = chatId;
}

private threadFor(destination: "leads" | "status") {
  const id = this.topics[destination];
  return id === undefined ? {} : { message_thread_id: id };
}

async sendLeadCard(lead: CardLead): Promise<number> {
  const message = await this.bot.api.sendMessage(
    this.chatId,
    formatCardText(lead),
    {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: buildCardKeyboard(lead),
      ...this.threadFor("leads"),
    },
  );
  return message.message_id;
}
```

Spread `...this.threadFor("status")` into the options of `sendDailySummary` and `sendErrorAlert`. Delete the private `escapeHtml` method and import it from `lead-card.js` instead.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/telegram-notifier.test.ts`
Expected: PASS — the 6 original tests plus 3 new.

- [ ] **Step 5: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/notifiers/telegram-notifier.ts tests/telegram-notifier.test.ts
pnpm --filter lead-scraper typecheck
git add apps/lead-scraper/src/notifiers/telegram-notifier.ts apps/lead-scraper/tests/telegram-notifier.test.ts
git commit -m "Route Telegram messages to forum topics"
```

---

### Task 6: Select and post cards from the nightly run

**Files:**
- Modify: `apps/lead-scraper/src/lib/lead-actions.ts` (add three functions)
- Modify: `apps/lead-scraper/src/database/database-service.ts` (expose the client)
- Modify: `apps/lead-scraper/src/graph/orchestrator.ts` (`notifyNode`)
- Modify: `apps/lead-scraper/src/index.ts` (pass topics into the notifier)
- Test: `apps/lead-scraper/tests/lead-selection.test.ts`

**Note:** `DatabaseService` holds `private prisma: PrismaClient` and lives at
`src/database/database-service.ts` (not `src/db/`). The orchestrator cannot reach
it as written today — Step 4 below adds a read-only accessor rather than creating a
second `PrismaClient`, which would open a redundant connection pool.

**Interfaces:**
- Consumes: `sendLeadCard` from Task 5.
- Produces:
  - `selectLeadsForCards(prisma, opts: { minScore: number; limit: number }): Promise<CardLead[]>`
  - `countUncardedAboveScore(prisma, minScore: number): Promise<number>`
  - `markCarded(prisma, leadId: string): Promise<void>` — stamps `notifiedAt`

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/lead-selection.test.ts
import { describe, expect, it, vi } from "vitest";
import { markCarded, selectLeadsForCards } from "../src/lib/lead-actions.js";

function stubPrisma() {
  return {
    lead: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal Prisma stub
  } as any;
}

describe("selectLeadsForCards", () => {
  it("filters on score, uncarded, not irrelevant, not archived", async () => {
    const prisma = stubPrisma();
    await selectLeadsForCards(prisma, { minScore: 60, limit: 10 });

    const { where } = prisma.lead.findMany.mock.calls[0][0];
    expect(where.score).toEqual({ gte: 60 });
    expect(where.notifiedAt).toBeNull();
    expect(where.isIrrelevant).toBe(false);
    expect(where.archived).toBe(false);
  });

  it("orders by score descending and applies the cap", async () => {
    const prisma = stubPrisma();
    await selectLeadsForCards(prisma, { minScore: 60, limit: 10 });

    const args = prisma.lead.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ score: "desc" });
    expect(args.take).toBe(10);
  });
});

describe("markCarded", () => {
  it("stamps notifiedAt so the lead is never carded twice", async () => {
    const prisma = stubPrisma();
    await markCarded(prisma, "l1");

    const { where, data } = prisma.lead.update.mock.calls[0][0];
    expect(where).toEqual({ id: "l1" });
    expect(data.notifiedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-selection.test.ts`
Expected: FAIL — `selectLeadsForCards` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `lead-actions.ts`:

```ts
const CARD_WHERE = (minScore: number) => ({
  score: { gte: minScore },
  notifiedAt: null,
  isIrrelevant: false,
  archived: false,
});

export async function selectLeadsForCards(
  prisma: PrismaClient,
  opts: { minScore: number; limit: number },
): Promise<CardLead[]> {
  const leads = await prisma.lead.findMany({
    where: CARD_WHERE(opts.minScore),
    orderBy: { score: "desc" },
    take: opts.limit,
    include: { painPoints: true },
  });

  return leads.map((lead) => ({
    id: lead.id,
    score: lead.score ?? 0,
    subreddit: lead.subreddit,
    title: lead.title,
    author: lead.author,
    postUrl: lead.postUrl,
    painPoints: lead.painPoints.map((pp) => ({
      category: pp.category,
      severity: pp.severity,
    })),
  }));
}

export async function countUncardedAboveScore(
  prisma: PrismaClient,
  minScore: number,
): Promise<number> {
  return prisma.lead.count({ where: CARD_WHERE(minScore) });
}

export async function markCarded(
  prisma: PrismaClient,
  leadId: string,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: { notifiedAt: new Date() },
  });
}
```

- [ ] **Step 4: Expose the Prisma client from `DatabaseService`**

Add to `apps/lead-scraper/src/database/database-service.ts`, inside the class:

```ts
/** Read-only access for callers that need queries this service does not wrap. */
get client(): PrismaClient {
  return this.prisma;
}
```

Leave `private prisma` private. The orchestrator uses `this.db.client`.

- [ ] **Step 5: Wire it into `notifyNode`**

In `orchestrator.ts`, after the daily summary send, add a carded-leads pass reusing the existing `send` wrapper so failures stay non-fatal:

```ts
const db = this.db.client;
const total = await countUncardedAboveScore(db, this.minScore);
const leads = await selectLeadsForCards(db, {
  minScore: this.minScore,
  limit: this.cardCap,
});

for (const lead of leads) {
  await send(`card:${lead.id}`, async () => {
    await this.notifier.sendLeadCard(lead);
    await markCarded(db, lead.id);
  });
}

if (total > leads.length) {
  console.log(`ℹ️  ${total - leads.length} more leads ≥ ${this.minScore} not carded (cap)`);
}
```

`markCarded` runs only after a successful send, so a failed card is retried on the next run.

- [ ] **Step 6: Thread the new settings through the constructors**

`LeadScraperOrchestrator`'s constructor currently takes
`(fireworksApiKey, telegramBotToken, telegramChatId)`. Extend it with an options
object so `index.ts` can pass configuration through:

```ts
constructor(
  fireworksApiKey: string,
  telegramBotToken: string,
  telegramChatId: string,
  options: {
    topics?: { leads?: number; status?: number };
    minScore?: number;
    cardCap?: number;
  } = {},
) {
  // ...existing assignments...
  this.notifier = new TelegramNotifier(
    telegramBotToken,
    telegramChatId,
    options.topics ?? {},
  );
  this.minScore = options.minScore ?? 60;
  this.cardCap = options.cardCap ?? 10;
}
```

Declare `private minScore: number;` and `private cardCap: number;` alongside the
other fields. In `index.ts`, pass
`{ topics: { leads: config.TELEGRAM_TOPIC_LEADS, status: config.TELEGRAM_TOPIC_STATUS }, minScore: config.LEAD_CARD_MIN_SCORE, cardCap: config.LEAD_CARD_DAILY_CAP }`.
Defaults keep the three-argument call sites in `index.ts`'s error path working.

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm --filter lead-scraper exec vitest run` and `pnpm --filter lead-scraper typecheck`
Expected: all pass except pre-existing `database-service.test.ts`.

- [ ] **Step 8: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/lib/lead-actions.ts src/database/database-service.ts src/graph/orchestrator.ts src/index.ts tests/lead-selection.test.ts
git add apps/lead-scraper/src/lib/lead-actions.ts apps/lead-scraper/src/database/database-service.ts apps/lead-scraper/src/graph/orchestrator.ts apps/lead-scraper/src/index.ts apps/lead-scraper/tests/lead-selection.test.ts
git commit -m "Post actionable lead cards from the nightly run"
```

---

### Task 7: Handle button presses

**Files:**
- Create: `apps/lead-scraper/src/bot/lead-bot.ts`
- Test: `apps/lead-scraper/tests/lead-bot.test.ts`

**Interfaces:**
- Consumes: `parseCallback` (Task 3), card formatters (Task 4), lead actions (Tasks 2 and 6).
- Produces: `createLeadBot(deps: { token: string; prisma: PrismaClient; fireworksApiKey: string }): Bot`

- [ ] **Step 1: Write the failing test**

```ts
// apps/lead-scraper/tests/lead-bot.test.ts
import { describe, expect, it, vi } from "vitest";
import { createLeadBot } from "../src/bot/lead-bot.js";

function callbackUpdate(data: string) {
  return {
    update_id: 1,
    callback_query: {
      id: "cb1",
      from: { id: 1, is_bot: false, first_name: "B" },
      chat_instance: "ci",
      data,
      message: {
        message_id: 100,
        date: 0,
        chat: { id: -1003966791760, type: "supergroup" as const, title: "PrintFeed" },
      },
    },
    // biome-ignore lint/suspicious/noExplicitAny: partial Update fixture
  } as any;
}

function setup(leadOverrides = {}) {
  const lead = {
    id: "clx1",
    score: 78,
    subreddit: "artbusiness",
    title: "Etsy fees",
    author: "artist",
    postUrl: "https://reddit.com/r/artbusiness/comments/a/b/",
    painPoints: [],
    ...leadOverrides,
  };

  const prisma = {
    lead: {
      findUnique: vi.fn().mockResolvedValue(lead),
      update: vi.fn().mockResolvedValue(lead),
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal Prisma stub
  } as any;

  const bot = createLeadBot({ token: "123:abc", prisma, fireworksApiKey: "fw" });
  const calls: Array<{ method: string; payload: unknown }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    return { ok: true, result: { message_id: 101 } } as never;
  });

  return { bot, prisma, calls };
}

describe("lead bot callbacks", () => {
  it("marks contacted and edits the card in place", async () => {
    const { bot, prisma, calls } = setup();
    await bot.init();
    await bot.handleUpdate(callbackUpdate("contacted:clx1"));

    expect(prisma.lead.update).toHaveBeenCalled();
    expect(calls.map((c) => c.method)).toContain("editMessageText");
    expect(calls.map((c) => c.method)).toContain("answerCallbackQuery");
  });

  it("answers rather than throwing on malformed callback data", async () => {
    const { bot, prisma, calls } = setup();
    await bot.init();
    await expect(bot.handleUpdate(callbackUpdate("garbage"))).resolves.not.toThrow();

    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(calls.map((c) => c.method)).toContain("answerCallbackQuery");
  });

  it("answers rather than throwing when the action fails", async () => {
    const { bot, prisma, calls } = setup();
    prisma.lead.findUnique.mockResolvedValue(null);
    await bot.init();

    await expect(bot.handleUpdate(callbackUpdate("contacted:clx1"))).resolves.not.toThrow();
    expect(calls.map((c) => c.method)).toContain("answerCallbackQuery");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-bot.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/lead-scraper/src/bot/lead-bot.ts
import type { PrismaClient } from "@prisma/client";
import { Bot } from "grammy";
import {
  archiveLead,
  draftOutreach,
  markContacted,
  markIrrelevant,
} from "../lib/lead-actions.js";
import {
  buildDraftKeyboard,
  formatDraftReply,
  formatResolvedCardText,
} from "../notifiers/lead-card.js";
import { parseCallback } from "./callback-data.js";

export interface LeadBotDeps {
  token: string;
  prisma: PrismaClient;
  fireworksApiKey: string;
}

export function createLeadBot(deps: LeadBotDeps): Bot {
  const bot = new Bot(deps.token);

  bot.on("callback_query:data", async (ctx) => {
    // Nothing below may throw: an uncaught error makes Telegram redeliver the
    // update, which would apply the same action twice.
    try {
      const parsed = parseCallback(ctx.callbackQuery.data);
      if (!parsed) {
        await ctx.answerCallbackQuery({ text: "Unrecognised button" });
        return;
      }
      await handleAction(ctx, parsed, deps);
    } catch (error) {
      console.error("Callback failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      await ctx
        .answerCallbackQuery({ text: `Failed: ${message}`.slice(0, 200) })
        .catch(() => {});
    }
  });

  return bot;
}
```

Implement `handleAction` in the same file:

```ts
async function loadCardLead(prisma: PrismaClient, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { painPoints: true },
  });
  if (!lead) throw new LeadNotFoundError(leadId);

  return {
    id: lead.id,
    score: lead.score ?? 0,
    subreddit: lead.subreddit,
    title: lead.title,
    author: lead.author,
    postUrl: lead.postUrl,
    painPoints: lead.painPoints.map((pp) => ({
      category: pp.category,
      severity: pp.severity,
    })),
  };
}

async function handleAction(
  // biome-ignore lint/suspicious/noExplicitAny: grammy callback context
  ctx: any,
  parsed: ParsedCallback,
  deps: LeadBotDeps,
): Promise<void> {
  const { prisma } = deps;
  const pressedOn: number = ctx.callbackQuery.message.message_id;
  const lead = await loadCardLead(prisma, parsed.leadId);

  if (parsed.action === "contacted" || parsed.action === "irrelevant") {
    if (parsed.action === "contacted") {
      await markContacted(prisma, lead.id);
    } else {
      await markIrrelevant(prisma, lead.id);
    }

    // The card is `pressedOn` when the button was on the card itself, and
    // `parsed.cardMessageId` when it was on a draft reply below it.
    const cardId = parsed.cardMessageId ?? pressedOn;
    await ctx.api.editMessageText(
      ctx.chat.id,
      cardId,
      formatResolvedCardText(lead, parsed.action, new Date()),
      { parse_mode: "HTML" },
    );

    // Pressed from a draft reply: settle that message's keyboard too.
    if (parsed.cardMessageId !== undefined) {
      await ctx.api
        .editMessageReplyMarkup(ctx.chat.id, pressedOn)
        .catch(() => {});
    }

    await ctx.answerCallbackQuery({
      text: parsed.action === "contacted" ? "Marked contacted" : "Marked irrelevant",
    });
    return;
  }

  if (parsed.action === "draft") {
    // Acknowledge first - the LLM call exceeds Telegram's ~10s callback window.
    await ctx.answerCallbackQuery({ text: "Drafting..." });

    try {
      const draft = await draftOutreach(prisma, lead.id, deps.fireworksApiKey);
      await ctx.reply(formatDraftReply(draft), {
        parse_mode: "HTML",
        reply_to_message_id: pressedOn,
        reply_markup: buildDraftKeyboard(lead.id, pressedOn),
      });
    } catch (error) {
      console.error("Draft failed:", error);
      await ctx.reply("draft failed — try again or open on Reddit", {
        reply_to_message_id: pressedOn,
      });
    }
    return;
  }

  // regenerate
  await ctx.answerCallbackQuery({ text: "Regenerating..." });
  const cardId = parsed.cardMessageId ?? pressedOn;
  try {
    const draft = await draftOutreach(prisma, lead.id, deps.fireworksApiKey);
    await ctx.api.editMessageText(
      ctx.chat.id,
      pressedOn,
      formatDraftReply(draft),
      { parse_mode: "HTML", reply_markup: buildDraftKeyboard(lead.id, cardId) },
    );
  } catch (error) {
    console.error("Regenerate failed:", error);
  }
}
```

Import `LeadNotFoundError` and `ParsedCallback` alongside the existing imports.
Do not import `archiveLead` — the bot has no archive button, and Biome will flag
the unused import.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lead-scraper exec vitest run tests/lead-bot.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/bot/lead-bot.ts tests/lead-bot.test.ts
pnpm --filter lead-scraper typecheck
git add apps/lead-scraper/src/bot/lead-bot.ts apps/lead-scraper/tests/lead-bot.test.ts
git commit -m "Apply lead actions from Telegram button presses"
```

---

### Task 8: Serve the webhook and register it

**Files:**
- Modify: `apps/lead-scraper/src/web/server.ts`
- Create: `apps/lead-scraper/scripts/set-telegram-webhook.ts`
- Create: `apps/lead-scraper/scripts/run-bot-polling.ts`
- Delete: `apps/lead-scraper/scripts/draft-outreach.ts`
- Modify: `apps/lead-scraper/package.json` (drop `draft-outreach*` scripts, add `telegram:webhook` and `bot:dev`)
- Modify: `apps/lead-scraper/README.md` and `DEPLOYMENT.md` (new env vars, webhook step)

**Interfaces:**
- Consumes: `createLeadBot` from Task 7.
- Produces: `POST /telegram/webhook` on `lead-scraper-web`.

- [ ] **Step 1: Mount the webhook**

In `server.ts`, after the existing routes:

```ts
import { webhookCallback } from "grammy";
import { createLeadBot } from "../bot/lead-bot.js";

if (process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_BOT_TOKEN) {
  const bot = createLeadBot({
    token: process.env.TELEGRAM_BOT_TOKEN,
    prisma,
    fireworksApiKey: process.env.FIREWORKS_API_KEY ?? "",
  });

  app.post(
    "/telegram/webhook",
    webhookCallback(bot, "express", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    }),
  );
  console.log("✓ Telegram webhook mounted at /telegram/webhook");
} else {
  console.log("ℹ️  Telegram webhook disabled (no TELEGRAM_WEBHOOK_SECRET)");
}
```

Mounting only when configured means an unconfigured environment still boots.

- [ ] **Step 2: Add the registration script**

```ts
// apps/lead-scraper/scripts/set-telegram-webhook.ts
#!/usr/bin/env tsx
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const url = process.argv[2];

if (!token || !secret || !url) {
  console.error("Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... tsx scripts/set-telegram-webhook.ts <https://host/telegram/webhook>");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["callback_query"],
  }),
});

console.log(await res.json());
```

`allowed_updates: ["callback_query"]` keeps ordinary group chatter from reaching the service.

- [ ] **Step 3: Add the local long-polling entry point**

The webhook needs a public HTTPS URL, which a laptop does not have. Add
`apps/lead-scraper/scripts/run-bot-polling.ts` so the same bot can be driven
locally without one:

```ts
#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { createLeadBot } from "../src/bot/lead-bot.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const bot = createLeadBot({
  token,
  prisma: new PrismaClient(),
  fireworksApiKey: process.env.FIREWORKS_API_KEY ?? "",
});

console.log("Polling for callback queries — Ctrl-C to stop");
await bot.start({ allowed_updates: ["callback_query"] });
```

Add the script entry `"bot:dev": "tsx --env-file=.env.dev scripts/run-bot-polling.ts"`.

**Never run this while the production webhook is registered.** Telegram refuses
`getUpdates` when a webhook is set, and calling `bot.start()` deletes it — which
would silently break production until it is re-registered. Use `.env.dev` and a
separate test bot token, or delete the webhook first.

- [ ] **Step 4: Remove the superseded script**

```bash
git rm apps/lead-scraper/scripts/draft-outreach.ts
```

Remove `draft-outreach` and `draft-outreach:dev` from `package.json` scripts and add:

```json
"telegram:webhook": "tsx scripts/set-telegram-webhook.ts"
```

- [ ] **Step 5: Verify the whole suite and typecheck**

Run: `pnpm --filter lead-scraper exec vitest run` and `pnpm --filter lead-scraper typecheck`
Expected: all pass except pre-existing `database-service.test.ts`.

- [ ] **Step 6: Document the new configuration**

Add `TELEGRAM_TOPIC_LEADS`, `TELEGRAM_TOPIC_STATUS`, `TELEGRAM_WEBHOOK_SECRET`, `LEAD_CARD_MIN_SCORE`, `LEAD_CARD_DAILY_CAP` to the env tables in `apps/lead-scraper/README.md`, `apps/lead-scraper/.env.example`, `.env.dev.example`, and the lead-scraper section of `DEPLOYMENT.md`. In `DEPLOYMENT.md`, record that the webhook must be registered once per environment with `pnpm --filter lead-scraper telegram:webhook https://lead-scraper-web-production.up.railway.app/telegram/webhook`.

- [ ] **Step 7: Commit**

```bash
pnpm --filter lead-scraper exec biome check --write src/web/server.ts scripts/set-telegram-webhook.ts scripts/run-bot-polling.ts
git add -A apps/lead-scraper docs DEPLOYMENT.md
git commit -m "Serve Telegram callbacks from the lead scraper web service"
```

---

## Deployment checklist (after all tasks)

1. Create the **Leads** topic in the PrintFeed supergroup; note its thread ID.
2. Set `TELEGRAM_TOPIC_LEADS` on both `lead-scraper-cron` and `lead-scraper-web`.
3. Set `TELEGRAM_WEBHOOK_SECRET` on `lead-scraper-web` only.
4. Deploy, then register the webhook once with `telegram:webhook`.
5. Confirm with `getWebhookInfo` that `pending_update_count` is 0 and no `last_error_message`.

Already done: `TELEGRAM_CHAT_ID=-1003966791760` and `TELEGRAM_TOPIC_STATUS=7` are set on both services.
