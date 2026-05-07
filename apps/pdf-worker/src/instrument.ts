import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "https://8e7ae13fc786fdb25c93ec75133e9855@o4511117015515136.ingest.de.sentry.io/4511336834793552",

  tracesSampleRate: 1.0,
  enableLogs: true,

  enabled: process.env.NODE_ENV === "production",

  environment: "pdf-worker",
});
