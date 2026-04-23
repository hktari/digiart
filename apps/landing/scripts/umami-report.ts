import "dotenv/config";
import { createUmamiClient } from "../lib/umami-client";

const DEFAULT_ENDPOINT = "https://api.umami.is/v1";
const DEFAULT_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

function parseArg(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function main() {
  const websiteId = parseArg("website") || DEFAULT_WEBSITE_ID;
  const startAt = parseArg("startAt");
  const endAt = parseArg("endAt");

  if (!websiteId) {
    throw new Error(
      "Website id missing. Provide --website=<id> or set NEXT_PUBLIC_UMAMI_WEBSITE_ID.",
    );
  }

  const client = createUmamiClient({ endpoint: DEFAULT_ENDPOINT });

  const metrics = await client.getWebsiteMetrics(websiteId, {
    startAt,
    endAt,
  });

  const pageviews = await client.getWebsitePageviews(websiteId, {
    startAt,
    endAt,
  });

  const events = await client.getWebsiteEvents(websiteId, {
    startAt,
    endAt,
  });

  if (!metrics.ok || !pageviews.ok || !events.ok) {
    console.error(
      JSON.stringify(
        {
          metrics: metrics.ok ? undefined : metrics,
          pageviews: pageviews.ok ? undefined : pageviews,
          events: events.ok ? undefined : events,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        websiteId,
        metrics: metrics.data,
        pageviews: pageviews.data,
        events: events.data,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
