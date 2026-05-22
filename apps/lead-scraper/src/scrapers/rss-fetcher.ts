import { XMLParser } from "fast-xml-parser";

export interface RedditPost {
  id: string;
  url: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  publishedAt: Date;
}

export interface RSSFetchResult {
  subreddit: string;
  posts: RedditPost[];
  error?: string;
}

export class RedditRSSFetcher {
  private parser: XMLParser;
  private readonly userAgent =
    "Mozilla/5.0 (compatible; LeadScraper/1.0; +https://digiart.gallery)";

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // Increase entity expansion limit to handle Reddit RSS feeds
      // Reddit feeds often exceed the default 1000 limit
      processEntities: false,
    });
  }

  async fetchSubreddit(subreddit: string, limit = 50): Promise<RSSFetchResult> {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new/.rss?limit=${limit}`;

      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        return {
          subreddit,
          posts: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const xml = await response.text();

      let parsed;
      try {
        parsed = this.parser.parse(xml);
      } catch (parseError) {
        return {
          subreddit,
          posts: [],
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        };
      }

      // Reddit RSS uses Atom format
      const feed = parsed.feed;
      if (!feed || !feed.entry) {
        return {
          subreddit,
          posts: [],
          error: "No entries found in RSS feed",
        };
      }

      const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
      const posts: RedditPost[] = entries
        .map((entry: any) => this.parseEntry(entry, subreddit))
        .filter((post: RedditPost | null): post is RedditPost => post !== null);

      return { subreddit, posts };
    } catch (error) {
      return {
        subreddit,
        posts: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchMultipleSubreddits(
    subreddits: string[],
    limit = 50,
  ): Promise<RSSFetchResult[]> {
    const promises = subreddits.map((sub) => this.fetchSubreddit(sub, limit));
    return Promise.all(promises);
  }

  private parseEntry(entry: any, subreddit: string): RedditPost | null {
    try {
      // Extract post ID from URL
      const url = entry.link?.["@_href"] || entry.id || "";
      const postId = this.extractPostId(url);

      if (!postId) {
        return null;
      }

      // Parse content (HTML in <content> tag)
      const htmlContent = entry.content?.["#text"] || entry.content || "";
      const content = this.stripHtml(htmlContent);

      // Parse published date
      const publishedAt = new Date(entry.updated || entry.published);

      return {
        id: postId,
        url,
        title: entry.title || "",
        content,
        author: entry.author?.name || "unknown",
        subreddit,
        publishedAt,
      };
    } catch (error) {
      console.error(`Failed to parse entry: ${error}`);
      return null;
    }
  }

  private extractPostId(url: string): string | null {
    // Reddit post URLs: https://www.reddit.com/r/subreddit/comments/{postId}/title/
    const match = url.match(/\/comments\/([a-z0-9]+)\//i);
    return match ? match[1] : null;
  }

  private stripHtml(html: string): string {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
