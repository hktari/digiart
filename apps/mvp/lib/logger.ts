/**
 * Thin logging wrapper that writes to stdout/stderr and, once @sentry/nextjs is
 * installed, forwards errors/warnings to Sentry.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Something broke", error, { orderId, userId });
 *   logger.warn("Degraded path taken", { collectorId });
 *   logger.info("Order submitted", { fulfillmentOrderId });
 *
 * Sentry integration:
 *   Install @sentry/nextjs, run `npx @sentry/wizard@latest -i nextjs`, then
 *   uncomment the Sentry import and calls below.
 */

// import * as Sentry from "@sentry/nextjs";

type Context = Record<string, unknown>;

function _toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

export const logger = {
  error(message: string, error?: unknown, context?: Context): void {
    console.error(`[ERROR] ${message}`, error ?? "", context ?? "");

    // Sentry.captureException(toError(error ?? message), {
    //   extra: { message, ...context },
    // });
  },

  warn(message: string, context?: Context): void {
    console.warn(`[WARN] ${message}`, context ?? "");

    // Sentry.addBreadcrumb({ level: "warning", message, data: context });
  },

  info(message: string, context?: Context): void {
    console.info(`[INFO] ${message}`, context ?? "");

    // Sentry.addBreadcrumb({ level: "info", message, data: context });
  },
};
