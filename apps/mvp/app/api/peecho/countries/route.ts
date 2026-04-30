import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const countries = await db.fulfillmentCountry.findMany({
      where: { isActive: true },
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        region: true,
      },
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error("Failed to fetch fulfillment countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch fulfillment countries" },
      { status: 500 },
    );
  }
}
