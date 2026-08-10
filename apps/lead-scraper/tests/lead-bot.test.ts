import { describe, expect, it, vi } from "vitest";
import { createLeadBot } from "../src/bot/lead-bot.js";

const CHAT_ID = -1003966791760;

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
        chat: { id: CHAT_ID, type: "supergroup" as const, title: "PrintFeed" },
      },
    },
    // biome-ignore lint/suspicious/noExplicitAny: partial Update fixture
  } as any;
}

function setup() {
  const lead = {
    id: "clx1",
    score: 78,
    subreddit: "artbusiness",
    title: "Etsy fees",
    author: "artist",
    postUrl: "https://reddit.com/r/artbusiness/comments/a/b/",
    painPoints: [],
  };

  const prisma = {
    lead: {
      findUnique: vi.fn().mockResolvedValue(lead),
      update: vi.fn().mockResolvedValue(lead),
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal Prisma stub
  } as any;

  const bot = createLeadBot({
    token: "123:abc",
    prisma,
    fireworksApiKey: "fw",
  });

  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: { message_id: 101 } } as never;
  });

  return { bot, prisma, calls, lead };
}

/** bot.init() issues getMe through the same transformer; ignore it. */
const methodsOf = (calls: Array<{ method: string }>) =>
  calls.map((c) => c.method).filter((m) => m !== "getMe");

describe("lead bot callbacks", () => {
  it("marks contacted and edits the card in place", async () => {
    const { bot, prisma, calls } = setup();
    await bot.init();
    await bot.handleUpdate(callbackUpdate("contacted:clx1"));

    expect(prisma.lead.update).toHaveBeenCalled();
    expect(methodsOf(calls)).toContain("editMessageText");
    expect(methodsOf(calls)).toContain("answerCallbackQuery");

    const edit = calls.find((c) => c.method === "editMessageText");
    expect(edit?.payload.message_id).toBe(100);
    expect(String(edit?.payload.text)).toContain("Contacted");
  });

  it("marks irrelevant and edits the card in place", async () => {
    const { bot, prisma, calls } = setup();
    await bot.init();
    await bot.handleUpdate(callbackUpdate("irrelevant:clx1"));

    expect(prisma.lead.update).toHaveBeenCalled();
    const edit = calls.find((c) => c.method === "editMessageText");
    expect(String(edit?.payload.text)).toContain("Irrelevant");
  });

  it("resolves the original card when Contacted is pressed on a draft reply", async () => {
    const { bot, calls } = setup();
    await bot.init();
    // Third field is the originating card's message id.
    await bot.handleUpdate(callbackUpdate("contacted:clx1:42"));

    const edit = calls.find((c) => c.method === "editMessageText");
    expect(edit?.payload.message_id).toBe(42);

    // The draft reply itself also gets its keyboard stripped.
    expect(methodsOf(calls)).toContain("editMessageReplyMarkup");
  });

  it("answers rather than throwing on malformed callback data", async () => {
    const { bot, prisma, calls } = setup();
    await bot.init();

    await expect(
      bot.handleUpdate(callbackUpdate("garbage")),
    ).resolves.not.toThrow();

    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(methodsOf(calls)).toContain("answerCallbackQuery");
  });

  it("answers rather than throwing when the lead is gone", async () => {
    const { bot, prisma, calls } = setup();
    prisma.lead.findUnique.mockResolvedValue(null);
    await bot.init();

    await expect(
      bot.handleUpdate(callbackUpdate("contacted:clx1")),
    ).resolves.not.toThrow();

    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(methodsOf(calls)).toContain("answerCallbackQuery");
    expect(methodsOf(calls)).not.toContain("editMessageText");
  });

  it("acknowledges a draft request before doing slow work", async () => {
    const { bot, calls } = setup();
    await bot.init();
    await bot.handleUpdate(callbackUpdate("draft:clx1"));

    // The LLM call has no valid API key here and fails; the point is that the
    // callback was answered first and the failure did not propagate.
    expect(methodsOf(calls)[0]).toBe("answerCallbackQuery");
    expect(methodsOf(calls)).toContain("sendMessage");
  });
});
