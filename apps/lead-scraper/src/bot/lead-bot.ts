import type { PrismaClient } from "@prisma/client";
import { Bot, type Context } from "grammy";
import {
  draftOutreach,
  LeadNotFoundError,
  markContacted,
  markIrrelevant,
} from "../lib/lead-actions.js";
import {
  buildDraftKeyboard,
  type CardLead,
  formatDraftReply,
  formatResolvedCardText,
} from "../notifiers/lead-card.js";
import { type ParsedCallback, parseCallback } from "./callback-data.js";

export interface LeadBotDeps {
  token: string;
  prisma: PrismaClient;
  fireworksApiKey: string;
}

interface PainPointRow {
  category: string;
  severity: string;
}

async function loadCardLead(
  prisma: PrismaClient,
  leadId: string,
): Promise<CardLead> {
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
    painPoints: lead.painPoints.map((pp: PainPointRow) => ({
      category: pp.category,
      severity: pp.severity,
    })),
  };
}

async function handleAction(
  ctx: Context,
  parsed: ParsedCallback,
  deps: LeadBotDeps,
): Promise<void> {
  const { prisma } = deps;
  const pressedOn = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  if (pressedOn === undefined || chatId === undefined) {
    await ctx.answerCallbackQuery({ text: "Message is no longer available" });
    return;
  }

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
      chatId,
      cardId,
      formatResolvedCardText(lead, parsed.action, new Date()),
      { parse_mode: "HTML" },
    );

    // Pressed from a draft reply: settle that message's keyboard too, so
    // neither message is left offering a stale button.
    if (parsed.cardMessageId !== undefined) {
      await ctx.api
        .editMessageReplyMarkup(chatId, pressedOn)
        .catch(() => undefined);
    }

    await ctx.answerCallbackQuery({
      text:
        parsed.action === "contacted"
          ? "Marked contacted"
          : "Marked irrelevant",
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
        reply_markup: buildDraftKeyboard(lead.id, pressedOn),
      });
    } catch (error) {
      console.error("Draft failed:", error);
      await ctx.reply("draft failed — try again or open on Reddit");
    }
    return;
  }

  // regenerate
  await ctx.answerCallbackQuery({ text: "Regenerating..." });
  const cardId = parsed.cardMessageId ?? pressedOn;
  try {
    const draft = await draftOutreach(prisma, lead.id, deps.fireworksApiKey);
    await ctx.api.editMessageText(chatId, pressedOn, formatDraftReply(draft), {
      parse_mode: "HTML",
      reply_markup: buildDraftKeyboard(lead.id, cardId),
    });
  } catch (error) {
    console.error("Regenerate failed:", error);
  }
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
        .catch(() => undefined);
    }
  });

  return bot;
}
