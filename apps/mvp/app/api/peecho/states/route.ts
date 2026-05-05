import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country");

    if (!countryCode) {
      return NextResponse.json(
        { error: "Country code is required" },
        { status: 400 },
      );
    }

    const states = await db.fulfillmentState.findMany({
      where: {
        countryCode: countryCode.toUpperCase(),
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        stateCode: true,
        name: true,
      },
    });

    return NextResponse.json(states);
  } catch (error) {
    logger.error("Failed to fetch fulfillment states", error);
    return NextResponse.json(
      { error: "Failed to fetch fulfillment states" },
      { status: 500 },
    );
  }
}
