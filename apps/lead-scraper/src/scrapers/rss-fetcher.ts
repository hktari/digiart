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

  /** Gap between subreddit requests. Reddit 429s an unauthenticated burst. */
  private static readonly REQUEST_GAP_MS = 2000;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_BASE_MS = 5000;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // Increase entity expansion limit to handle Reddit RSS feeds
      // Reddit feeds often exceed the default 1000 limit
      processEntities: false,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchSubreddit(subreddit: string, limit = 50): Promise<RSSFetchResult> {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new/.rss?limit=${limit}`;

      // Reddit answers a burst by serving the first caller and 429-ing the
      // rest, so a 429 says "too fast", not "no". Back off and re-ask rather
      // than recording an error for a subreddit that would have answered.
      let response!: Response;
      for (let attempt = 0; attempt <= RedditRSSFetcher.MAX_RETRIES; attempt++) {
        response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
        });

        if (response.status !== 429) break;
        if (attempt === RedditRSSFetcher.MAX_RETRIES) break;

        // Honour Retry-After when Reddit sends it; otherwise exponential.
        const retryAfter = Number(response.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : RedditRSSFetcher.RETRY_BASE_MS * 2 ** attempt;
        await this.sleep(waitMs);
      }

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

  /**
   * Sequential on purpose. `Promise.all` over the full subreddit list fired
   * every request at once; Reddit served the first and 429'd the other 14,
   * which the run still recorded as "completed". The scraper looked healthy
   * while watching one subreddit out of seventeen.
   */
  async fetchMultipleSubreddits(
    subreddits: string[],
    limit = 50,
  ): Promise<RSSFetchResult[]> {
    const results: RSSFetchResult[] = [];

    for (const [index, sub] of subreddits.entries()) {
      if (index > 0) await this.sleep(RedditRSSFetcher.REQUEST_GAP_MS);
      results.push(await this.fetchSubreddit(sub, limit));
    }

    return results;
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
