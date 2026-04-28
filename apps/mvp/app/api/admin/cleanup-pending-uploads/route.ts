import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanupPendingUploads } from "@/lib/s3-cleanup";

/**
 * Admin endpoint to clean up old pending uploads.
 * Can be called manually or via scheduled job (Railway cron, etc.)
 *
 * Authentication: Requires admin user session OR valid CRON_SECRET header
 * for scheduled job invocation.
 */
export async function POST(req: NextRequest) {
  // Check for cron secret header (for scheduled jobs)
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedCronSecret = process.env.CRON_SECRET;

  let isAuthorized = false;

  if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
    isAuthorized = true;
  } else {
    // Check for admin session
    const session = await auth();
    if (session?.user?.id) {
      const userRole = await db.userRole.findFirst({
        where: {
          userId: session.user.id,
          role: "ADMIN",
        },
      });
      if (userRole) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Default to 24 hours, allow override via query param
    const { searchParams } = new URL(req.url);
    const maxAgeHours = parseInt(searchParams.get("maxAgeHours") || "24", 10);

    const result = await cleanupPendingUploads(maxAgeHours);

    return NextResponse.json({
      success: true,
      maxAgeHours,
      deleted: result.deleted,
      errors: result.errors,
      keys: result.keys,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
