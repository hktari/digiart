import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const returnTo = searchParams.get("returnTo") || "/creator/setup";

  if (!email) {
    redirect("/creator/setup?error=missing_email");
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    redirect("/creator/setup?error=paypal_not_configured");
  }

  const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
  const paypalAuthUrl =
    environment === "production"
      ? "https://www.paypal.com/connect"
      : "https://www.sandbox.paypal.com/connect";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Build OAuth URL with required scopes and policy URLs
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: `${appUrl}/api/paypal/callback`,
    privacy_policy_url: `${appUrl}/privacy`,
    user_agreement_url: `${appUrl}/terms`,
    state: Buffer.from(
      JSON.stringify({ userId: session.user.id, email, returnTo }),
    ).toString("base64"),
  });

  redirect(`${paypalAuthUrl}?${params.toString()}`);
}
