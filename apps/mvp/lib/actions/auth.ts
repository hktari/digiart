"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";

const emailSchema = z.string().email("Please enter a valid email address.");

export async function sendMagicLink(formData: FormData): Promise<void> {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);

  if (!parsed.success) {
    redirect(`/auth/sign-in?error=invalid_email`);
  }

  await signIn("resend", {
    email: parsed.data,
    redirectTo: "/",
  });
}
