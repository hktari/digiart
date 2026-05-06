import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      payoutProfile: {
        select: {
          paypalEmail: true,
          isPayPalVerified: true,
          payPalVerifiedAt: true,
        },
      },
    },
  });

  if (!profile?.payoutProfile) {
    return NextResponse.json({
      paypalEmail: null,
      isVerified: false,
      verifiedAt: null,
    });
  }

  return NextResponse.json({
    paypalEmail: profile.payoutProfile.paypalEmail,
    isVerified: profile.payoutProfile.isPayPalVerified,
    verifiedAt: profile.payoutProfile.payPalVerifiedAt?.toISOString() || null,
  });
}
