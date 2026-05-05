import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getQuote } from "@/lib/peecho/quote-service";

const quoteRequestSchema = z.object({
  country: z.string().min(2).max(2),
  pageCount: z.number().min(1),
  offeringId: z.string().optional(),
  countryStateCode: z.string().min(2).max(2).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = quoteRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const normalizedCountry = result.data.country.toUpperCase();
    const normalizedStateCode = result.data.countryStateCode?.toUpperCase();

    if (normalizedCountry === "US" && !normalizedStateCode) {
      return NextResponse.json(
        {
          error:
            "countryStateCode is required for US shipping quotes (e.g. CA, NY)",
        },
        { status: 400 },
      );
    }

    const quote = await getQuote({
      country: normalizedCountry,
      pageCount: result.data.pageCount,
      offeringId: result.data.offeringId,
      countryStateCode: normalizedStateCode,
    });

    return NextResponse.json(quote);
  } catch (error) {
    logger.error("Quote API error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get quote" },
      { status: 500 },
    );
  }
}
