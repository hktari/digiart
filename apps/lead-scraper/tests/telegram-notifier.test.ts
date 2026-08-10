import { beforeEach, describe, expect, it } from "vitest";
import {
  type NotificationStats,
  TelegramNotifier,
} from "../src/notifiers/telegram-notifier.js";
import type { QualifiedPost } from "../src/qualifiers/llm-qualifier.js";

interface SentMessage {
  text: string;
  options: { parse_mode?: string };
}

/**
 * Captures what would have been sent instead of hitting the Telegram API.
 */
function createNotifier(): {
  notifier: TelegramNotifier;
  sent: SentMessage[];
} {
  const notifier = new TelegramNotifier("123456:test-token", "-100");
  const sent: SentMessage[] = [];

  // biome-ignore lint/suspicious/noExplicitAny: reaching into grammy's api stub
  const bot = (notifier as any).bot;
  bot.api.sendMessage = async (
    _chatId: string,
    text: string,
    options: { parse_mode?: string },
  ) => {
    sent.push({ text, options });
  };

  return { notifier, sent };
}

const stats: NotificationStats = {
  totalPosts: 327,
  filteredPosts: 42,
  qualifiedLeads: 42,
  hotLeads: 0,
  errors: 7,
};

function createLead(overrides: Partial<QualifiedPost> = {}): QualifiedPost {
  return {
    id: "1vjfa8z",
    // Reddit slugs are full of underscores - these broke Markdown parsing.
    url: "https://www.reddit.com/r/artbusiness/comments/1vjfa8z/discussion_artists_who_are_not_good_at_marketing/",
    title: "[Discussion] Artists who are not good at marketing, how do you...",
    content: "",
    author: "someone",
    subreddit: "artbusiness",
    publishedAt: new Date("2026-08-09T06:00:00Z"),
    filterResult: { passed: true, matches: [], totalScore: 5 },
    qualification: {
      score: 65,
      reasoning: "Artist struggling with marketing & discovery",
      painPoints: [
        {
          category: "discovery",
          description: "Cannot reach an audience",
          severity: "high",
        },
      ],
      isHotLead: false,
    },
    ...overrides,
  } as QualifiedPost;
}

describe("TelegramNotifier", () => {
  let notifier: TelegramNotifier;
  let sent: SentMessage[];

  beforeEach(() => {
    ({ notifier, sent } = createNotifier());
  });

  it("sends the daily summary as HTML", async () => {
    await notifier.sendDailySummary([createLead()], stats);

    expect(sent).toHaveLength(1);
    expect(sent[0].options.parse_mode).toBe("HTML");
  });

  it("does not emit Markdown backslash escapes into the message", async () => {
    await notifier.sendDailySummary([createLead()], stats);

    // The old MarkdownV2 escaper leaked literal "\[" and "\." into the text.
    expect(sent[0].text).not.toContain("\\");
    expect(sent[0].text).toContain("[Discussion] Artists who are not good");
  });

  it("reproduces the 2026-08-09 payload without unbalanced entities", async () => {
    // Two warm leads with bracketed titles and underscore-heavy URLs is the
    // exact shape that produced "can't parse entities" and crashed the run.
    await notifier.sendDailySummary(
      [
        createLead(),
        createLead({
          id: "1vjcbb4",
          url: "https://www.reddit.com/r/artbusiness/comments/1vjcbb4/suppliers_pod_australia_journals_notebooks/",
          title: "[Suppliers] POD Australia Journals/ Notebooks",
        }),
      ],
      stats,
    );

    const { text } = sent[0];
    expect(text).toContain("Top Warm Leads (2)");
    // Underscores travel through HTML mode untouched; no entity is opened.
    expect(text).toContain("discussion_artists_who_are_not_good_at_marketing");
    expect(countUnescapedTags(text)).toBe(0);
  });

  it("escapes HTML-reserved characters in lead titles", async () => {
    await notifier.sendDailySummary(
      [createLead({ title: "Etsy <script> & fees > 20% killing me" })],
      stats,
    );

    expect(sent[0].text).toContain("Etsy &lt;script&gt; &amp; fees &gt; 20%");
    expect(sent[0].text).not.toContain("<script>");
  });

  it("escapes reserved characters in hot lead alerts", async () => {
    const lead = createLead({
      title: "Prints & <b>bold</b> claims",
      author: "user<1>",
      qualification: {
        score: 88,
        reasoning: "Wants POD > current provider & fast",
        painPoints: [
          {
            category: "print_physical",
            description: "Costs > margin",
            severity: "high",
          },
        ],
        isHotLead: true,
      },
    });

    await notifier.sendHotLeadAlert(lead);

    const { text } = sent[0];
    expect(sent[0].options.parse_mode).toBe("HTML");
    expect(text).toContain("Prints &amp; &lt;b&gt;bold&lt;/b&gt; claims");
    expect(text).toContain("u/user&lt;1&gt;");
    expect(text).toContain("Costs &gt; margin");
    expect(countUnescapedTags(text)).toBe(0);
  });

  it("escapes the stack trace in error alerts", async () => {
    const error = new Error("Bad <thing> & worse");
    error.stack = "Error: Bad <thing>\n  at <anonymous> (a.ts:1:1)";

    await notifier.sendErrorAlert(error, "Lead scraper failed <hard>");

    const { text } = sent[0];
    expect(text).toContain("Bad &lt;thing&gt; &amp; worse");
    expect(text).toContain("Lead scraper failed &lt;hard&gt;");
    expect(text).toContain("at &lt;anonymous&gt;");
    expect(countUnescapedTags(text)).toBe(0);
  });
});

/**
 * Counts tags Telegram would reject. Only the markup this notifier emits is
 * allowed; anything else means an interpolated value escaped its escaping.
 */
function countUnescapedTags(text: string): number {
  const allowed = new Set(["b", "/b", "i", "/i", "pre", "/pre"]);
  const tags = text.match(/<[^>]*>/g) ?? [];
  return tags.filter((tag) => !allowed.has(tag.slice(1, -1))).length;
}
