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

/**
 * Escape the only three characters Telegram's HTML parse mode reserves.
 * `&` must be replaced first so the ampersands it introduces survive.
 */
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

/** A <pre> block so the draft is one-tap copyable on mobile. */
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
