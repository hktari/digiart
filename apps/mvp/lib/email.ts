import { Resend } from "resend";
import { logger } from "@/lib/logger";

/**
 * Transactional email.
 *
 * NextAuth's Resend provider sends sign-in links, but nothing else in the app
 * could send mail — `EmailNotificationLog` rows are written in six places and
 * read in none. This is the minimum needed to make a user-facing promise true;
 * it is deliberately small, not a notification framework.
 *
 * The key is `AUTH_RESEND_KEY` because that is the one already configured for
 * the auth provider — introducing a second variable would mean a working
 * deployment that silently cannot send.
 */
const RESEND_API_KEY =
  process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = { sent: boolean; error?: string };

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  if (!RESEND_API_KEY || !from) {
    // Callers decide what a failure means for the user; never throw into a
    // request path over a missing config.
    logger.error("[email] not configured", {
      hasKey: Boolean(RESEND_API_KEY),
      hasFrom: Boolean(from),
    });
    return { sent: false, error: "Email is not configured" };
  }

  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      logger.error("[email] send rejected", { subject, error });
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (error) {
    logger.error("[email] send failed", { subject, error });
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
