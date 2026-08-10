import { Bot } from "grammy";
import type { QualifiedPost } from "../qualifiers/llm-qualifier.js";

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

  constructor(botToken: string, chatId: string) {
    this.bot = new Bot(botToken);
    this.chatId = chatId;
  }

  async sendHotLeadAlert(post: QualifiedPost): Promise<void> {
    if (!post.qualification) {
      throw new Error("Post has no qualification data");
    }

    const message = this.formatHotLeadMessage(post);

    await this.bot.api.sendMessage(this.chatId, message, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: false },
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
    });
  }

  async sendErrorAlert(error: Error, context?: string): Promise<void> {
    const message = `🚨 <b>Lead Scraper Error</b>

${context ? `<b>Context:</b> ${this.escapeHtml(context)}\n\n` : ""}<b>Error:</b> ${this.escapeHtml(error.message)}

<b>Stack:</b>
<pre>${this.escapeHtml(error.stack?.substring(0, 500) || "No stack trace")}</pre>

<b>Time:</b> ${this.formatDate(new Date())}`;

    await this.bot.api.sendMessage(this.chatId, message, {
      parse_mode: "HTML",
    });
  }

  private formatHotLeadMessage(post: QualifiedPost): string {
    const qual = post.qualification!;

    const painPointsList = qual.painPoints
      .map(
        (pp) =>
          `  • ${this.escapeHtml(pp.category)} (${this.escapeHtml(pp.severity)}): ${this.escapeHtml(pp.description)}`,
      )
      .join("\n");

    return `🔥 <b>HOT LEAD DETECTED</b> 🔥

<b>Score:</b> ${qual.score}/100

<b>Subreddit:</b> r/${this.escapeHtml(post.subreddit)}
<b>Author:</b> u/${this.escapeHtml(post.author)}
<b>Posted:</b> ${this.formatDate(post.publishedAt)}

<b>Title:</b> ${this.escapeHtml(post.title)}

<b>Reasoning:</b>
${this.escapeHtml(qual.reasoning)}

<b>Pain Points:</b>
${painPointsList}

<b>Post URL:</b> ${this.escapeHtml(post.url)}

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
    const subreddit = this.escapeHtml(post.subreddit);
    const title = this.escapeHtml(
      post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title,
    );

    return `• [${score}] r/${subreddit}: ${title}\n  ${this.escapeHtml(post.url)}\n`;
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

  /**
   * Escape the only three characters Telegram's HTML parse mode reserves.
   * `&` must be replaced first so the ampersands it introduces survive.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
