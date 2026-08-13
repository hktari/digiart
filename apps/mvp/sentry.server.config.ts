// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const env = process.env.VERCEL_ENV || process.env.NODE_ENV;

Sentry.init({
  dsn: "https://8e7ae13fc786fdb25c93ec75133e9855@o4511117015515136.ingest.de.sentry.io/4511336834793552",

  // Sampling every transaction means the SDK builds and holds a full span
  // tree for each one, and the OTel instrumentation it installs to do that
  // is the heaviest thing running in an otherwise idle server. 10% is plenty
  // of signal at this traffic level.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  enabled: env === "production",

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
