import { describe, expect, it } from "vitest";
import {
  buildCardKeyboard,
  type CardLead,
  formatCardText,
  formatDraftReply,
  formatResolvedCardText,
} from "../src/notifiers/lead-card.js";

const lead: CardLead = {
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

  it("leaves underscore-heavy values untouched", () => {
    // Underscores are what broke the old Markdown path; HTML ignores them.
    expect(formatCardText(lead)).toContain("some_artist");
  });
});

describe("buildCardKeyboard", () => {
  it("offers three callback buttons and one Reddit URL button", () => {
    const buttons = buildCardKeyboard(lead).inline_keyboard.flat();
    const callbacks = buttons.filter((b) => "callback_data" in b);
    const urls = buttons.filter((b) => "url" in b);

    expect(
      callbacks.map((b) => (b as { callback_data: string }).callback_data),
    ).toEqual(["draft:clx1", "contacted:clx1", "irrelevant:clx1"]);
    expect(urls).toHaveLength(1);
    expect((urls[0] as { url: string }).url).toBe(lead.postUrl);
  });
});

describe("formatResolvedCardText", () => {
  it("records the outcome while keeping the original detail", () => {
    const text = formatResolvedCardText(
      lead,
      "contacted",
      new Date("2026-08-10T10:32:00Z"),
    );
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
