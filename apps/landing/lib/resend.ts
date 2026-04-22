import { Resend } from "resend";

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function addToWaitlist(
  email: string,
  audience: "creator" | "collector",
) {
  const resend = getResendClient();

  if (!resend) {
    console.error("Resend API key not configured");
    return { success: false, error: "Email service not configured" };
  }
  try {
    const response = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: audience,
    });

    return { success: true, data: response, audience };
  } catch (error) {
    console.error("Resend error:", error);
    return { success: false, error };
  }
}
