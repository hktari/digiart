"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AnalyticsEvents, trackAnonymousEvent } from "@/lib/analytics/events";
import { signIn } from "@/lib/auth";

const emailSchema = z.string().email("Please enter a valid email address.");

export async function sendMagicLink(formData: FormData): Promise<void> {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);

  if (!parsed.success) {
    redirect(`/auth/sign-in?error=invalid_email`);
  }

  const callbackUrl = formData.get("callbackUrl")?.toString();

  await signIn("resend", {
    email: parsed.data,
    redirect: false,
    ...(callbackUrl ? { callbackUrl } : {}),
  });

  void trackAnonymousEvent(AnalyticsEvents.AUTH_MAGIC_LINK_SENT, {
    email: parsed.data,
  });

  redirect("/auth/verify");
}
