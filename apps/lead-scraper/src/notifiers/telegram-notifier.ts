import TelegramBot from "node-telegram-bot-api";
import type { QualifiedPost } from "../qualifiers/llm-qualifier.js";

export interface NotificationStats {
  totalPosts: number;
  filteredPosts: number;
  qualifiedLeads: number;
  hotLeads: number;
  errors: number;
}

export class TelegramNotifier {
  private bot: TelegramBot;
  private chatId: string;

  constructor(botToken: string, chatId: string) {
    this.bot = new TelegramBot(botToken, { polling: false });
    this.chatId = chatId;
  }

  async sendHotLeadAlert(post: QualifiedPost): Promise<void> {
    if (!post.qualification) {
      throw new Error("Post has no qualification data");
    }

    const message = this.formatHotLeadMessage(post);

    await this.bot.sendMessage(this.chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
  }

  async sendDailySummary(
    posts: QualifiedPost[],
    stats: NotificationStats,
  ): Promise<void> {
    const message = this.formatDailySummaryMessage(posts, stats);

    await this.bot.sendMessage(this.chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  }

  async sendErrorAlert(error: Error, context?: string): Promise<void> {
    const message = `🚨 *Lead Scraper Error*

${context ? `*Context:* ${this.escapeMarkdown(context)}\n\n` : ""}*Error:* ${this.escapeMarkdown(error.message)}

*Stack:*
\`\`\`
${error.stack?.substring(0, 500) || "No stack trace"}
\`\`\`

*Time:* ${this.formatDate(new Date())}`;

    await this.bot.sendMessage(this.chatId, message, {
      parse_mode: "Markdown",
    });
  }

  private formatHotLeadMessage(post: QualifiedPost): string {
    const qual = post.qualification!;

    const painPointsList = qual.painPoints
      .map(
        (pp) =>
          `  • ${pp.category} (${pp.severity}): ${this.escapeMarkdown(pp.description)}`,
      )
      .join("\n");

    return `🔥 *HOT LEAD DETECTED* 🔥

*Score:* ${qual.score}/100

*Subreddit:* r/${post.subreddit}
*Author:* u/${this.escapeMarkdown(post.author)}
*Posted:* ${this.formatDate(post.publishedAt)}

*Title:* ${this.escapeMarkdown(post.title)}

*Reasoning:*
${this.escapeMarkdown(qual.reasoning)}

*Pain Points:*
${painPointsList}

*Post URL:* ${post.url}

---
⚡ *Action Required:* Review and reach out within 24 hours`;
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

    let message = `📊 *Daily Lead Scraping Summary*

*Stats:*
• Total Posts Scraped: ${stats.totalPosts}
• Passed Keyword Filter: ${stats.filteredPosts}
• Qualified Leads: ${stats.qualifiedLeads}
• Hot Leads: ${stats.hotLeads}
${stats.errors > 0 ? `• Errors: ${stats.errors}` : ""}

`;

    if (hotLeads.length > 0) {
      message += `*🔥 Hot Leads (${hotLeads.length}):*\n`;
      for (const lead of hotLeads) {
        message += this.formatLeadSummaryLine(lead);
      }
      message += "\n";
    }

    if (warmLeads.length > 0) {
      message += `*🌡️ Top Warm Leads (${warmLeads.length}):*\n`;
      for (const lead of warmLeads) {
        message += this.formatLeadSummaryLine(lead);
      }
      message += "\n";
    }

    if (hotLeads.length === 0 && warmLeads.length === 0) {
      message += "No high-quality leads found today.\n";
    }

    message += `\n_Scraped at: ${this.formatDate(new Date())}_`;

    return message;
  }

  private formatLeadSummaryLine(post: QualifiedPost): string {
    const score = post.qualification?.score || 0;
    const subreddit = post.subreddit;
    const title = this.escapeMarkdown(
      post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title,
    );

    return `• [${score}] r/${subreddit}: ${title}\n  ${post.url}\n`;
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

  private escapeMarkdown(text: string): string {
    // Escape Telegram markdown special characters
    // Need to escape backslash first, then other special chars
    return text
      .replace(/\\/g, "\\\\")
      .replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }
}
