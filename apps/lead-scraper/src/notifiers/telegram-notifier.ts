import { Bot } from "grammy";
import type { QualifiedPost } from "../qualifiers/llm-qualifier.js";
import {
  buildCardKeyboard,
  type CardLead,
  escapeHtml,
  formatCardText,
} from "./lead-card.js";

export interface TelegramTopics {
  leads?: number;
  status?: number;
}

export interface NotificationStats {
  totalPosts: number;
  filteredPosts: number;
  qualifiedLeads: number;
  hotLeads: number;
  errors: number;
}

/**
 * Messages are sent with parse_mode "HTML" rather than Markdown.
 *
 * Telegram's Markdown dialects require every one of `_*[]()~`>#+-=|{}.!` to be
 * escaped in literal text, so a single unescaped character anywhere in a lead
 * title or a Reddit URL (which are full of underscores) makes the whole
 * sendMessage call fail with "can't parse entities". HTML only reserves three
 * characters, and only inside interpolated values — literal punctuation in the
 * templates below needs no escaping at all.
 */
export class TelegramNotifier {
  private bot: Bot;
  private chatId: string;

  constructor(
    botToken: string,
    chatId: string,
    private topics: TelegramTopics = {},
  ) {
    this.bot = new Bot(botToken);
    this.chatId = chatId;
  }

  /**
   * Forum supergroups route by message_thread_id. Omitting it entirely lands
   * the message in General, which is the correct degradation when a topic is
   * not configured - Telegram rejects an explicit thread id of 1.
   */
  private threadFor(destination: "leads" | "status") {
    const id = this.topics[destination];
    return id === undefined ? {} : { message_thread_id: id };
  }

  /** Posts an actionable card and returns its message id. */
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

  async sendHotLeadAlert(post: QualifiedPost): Promise<void> {
    if (!post.qualification) {
      throw new Error("Post has no qualification data");
    }

    const message = this.formatHotLeadMessage(post);

    await this.bot.api.sendMessage(this.chatId, message, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: false },
      ...this.threadFor("status"),
    });
  }

  async sendDailySummary(
    posts: QualifiedPost[],
    stats: NotificationStats,
  ): Promise<void> {
    const message = this.formatDailySummaryMessage(posts, stats);

    await this.bot.api.sendMessage(this.chatId, message, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...this.threadFor("status"),
    });
  }

  async sendErrorAlert(error: Error, context?: string): Promise<void> {
    const message = `🚨 <b>Lead Scraper Error</b>

${context ? `<b>Context:</b> ${escapeHtml(context)}\n\n` : ""}<b>Error:</b> ${escapeHtml(error.message)}

<b>Stack:</b>
<pre>${escapeHtml(error.stack?.substring(0, 500) || "No stack trace")}</pre>

<b>Time:</b> ${this.formatDate(new Date())}`;

    await this.bot.api.sendMessage(this.chatId, message, {
      parse_mode: "HTML",
      ...this.threadFor("status"),
    });
  }

  private formatHotLeadMessage(post: QualifiedPost): string {
    const qual = post.qualification!;

    const painPointsList = qual.painPoints
      .map(
        (pp) =>
          `  • ${escapeHtml(pp.category)} (${escapeHtml(pp.severity)}): ${escapeHtml(pp.description)}`,
      )
      .join("\n");

    return `🔥 <b>HOT LEAD DETECTED</b> 🔥

<b>Score:</b> ${qual.score}/100

<b>Subreddit:</b> r/${escapeHtml(post.subreddit)}
<b>Author:</b> u/${escapeHtml(post.author)}
<b>Posted:</b> ${this.formatDate(post.publishedAt)}

<b>Title:</b> ${escapeHtml(post.title)}

<b>Reasoning:</b>
${escapeHtml(qual.reasoning)}

<b>Pain Points:</b>
${painPointsList}

<b>Post URL:</b> ${escapeHtml(post.url)}

---
⚡ <b>Action Required:</b> Review and reach out within 24 hours`;
  }

  private formatDailySummaryMessage(
    posts: QualifiedPost[],
    stats: NotificationStats,
  ): string {
    const hotLeads = posts
      .filter((p) => p.qualification?.isHotLead)
      .sort(
        (a, b) => (b.qualification?.score || 0) - (a.qualification?.score || 0),
      );

    const warmLeads = posts
      .filter(
        (p) =>
          p.qualification &&
          !p.qualification.isHotLead &&
          p.qualification.score >= 60,
      )
      .sort(
        (a, b) => (b.qualification?.score || 0) - (a.qualification?.score || 0),
      )
      .slice(0, 5); // Top 5 warm leads

    let message = `📊 <b>Daily Lead Scraping Summary</b>

<b>Stats:</b>
• Total Posts Scraped: ${stats.totalPosts}
• Passed Keyword Filter: ${stats.filteredPosts}
• Qualified Leads: ${stats.qualifiedLeads}
• Hot Leads: ${stats.hotLeads}
${stats.errors > 0 ? `• Errors: ${stats.errors}` : ""}

`;

    if (hotLeads.length > 0) {
      message += `<b>🔥 Hot Leads (${hotLeads.length}):</b>\n`;
      for (const lead of hotLeads) {
        message += this.formatLeadSummaryLine(lead);
      }
      message += "\n";
    }

    if (warmLeads.length > 0) {
      message += `<b>🌡️ Top Warm Leads (${warmLeads.length}):</b>\n`;
      for (const lead of warmLeads) {
        message += this.formatLeadSummaryLine(lead);
      }
      message += "\n";
    }

    if (hotLeads.length === 0 && warmLeads.length === 0) {
      message += "No high-quality leads found today.\n";
    }

    message += `\n<i>Scraped at: ${this.formatDate(new Date())}</i>`;

    return message;
  }

  private formatLeadSummaryLine(post: QualifiedPost): string {
    const score = post.qualification?.score || 0;
    const subreddit = escapeHtml(post.subreddit);
    const title = escapeHtml(
      post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title,
    );

    return `• [${score}] r/${subreddit}: ${title}\n  ${escapeHtml(post.url)}\n`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
