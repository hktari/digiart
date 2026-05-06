import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface PayPalUserInfo {
  user_id: string;
  emails?: Array<{ value: string; primary?: boolean }>;
  email?: string;
  verified?: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("PayPal OAuth error:", error, errorDescription);
    redirect(
      `/creator/setup?error=paypal_auth_failed&message=${encodeURIComponent(errorDescription || error)}`,
    );
  }

  if (!code || !state) {
    redirect("/creator/setup?error=invalid_callback");
  }

  // Decode state to get user info
  let stateData: { userId: string; email: string; returnTo: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    redirect("/creator/setup?error=invalid_state");
  }

  const { userId, email, returnTo } = stateData;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    redirect("/creator/setup?error=paypal_not_configured");
  }

  const environment = process.env.PAYPAL_ENVIRONMENT ?? "sandbox";
  const baseUrl =
    environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/paypal/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("PayPal token exchange failed:", errorText);
      redirect(`/creator/setup?error=paypal_token_failed`);
    }

    const tokenData = (await tokenResponse.json()) as PayPalTokenResponse;

    // Get user info from PayPal
    const userInfoResponse = await fetch(
      `${baseUrl}/v1/identity/oauth2/userinfo?schema=openid`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("PayPal userinfo fetch failed:", errorText);
      redirect(`/creator/setup?error=paypal_userinfo_failed`);
    }

    const userInfo = (await userInfoResponse.json()) as PayPalUserInfo;

    // Extract email from PayPal response (can be in different formats)
    const paypalEmail =
      userInfo.emails?.find((e) => e.primary)?.value ||
      userInfo.emails?.[0]?.value ||
      userInfo.email;

    // Verify the PayPal email matches what the user entered
    if (paypalEmail && paypalEmail.toLowerCase() !== email.toLowerCase()) {
      redirect(
        `/creator/setup?error=email_mismatch&expected=${encodeURIComponent(email)}&actual=${encodeURIComponent(paypalEmail)}`,
      );
    }

    // Store verification in database
    const profile = await db.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      redirect("/creator/setup?error=profile_not_found");
    }

    await db.creatorPayoutProfile.upsert({
      where: { creatorProfileId: profile.id },
      create: {
        creatorProfileId: profile.id,
        paypalEmail: email,
        paypalAccountId: userInfo.user_id,
        isPayPalVerified: true,
        payPalVerifiedAt: new Date(),
        isReady: true, // Verified PayPal = ready for payouts
      },
      update: {
        paypalEmail: email,
        paypalAccountId: userInfo.user_id,
        isPayPalVerified: true,
        payPalVerifiedAt: new Date(),
        isReady: true,
      },
    });

    // Redirect back with success
    redirect(`${returnTo}?paypal_verified=true`);
  } catch (error) {
    console.error("PayPal verification error:", error);
    redirect("/creator/setup?error=verification_failed");
  }
}
