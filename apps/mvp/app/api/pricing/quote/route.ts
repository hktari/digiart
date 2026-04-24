import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuote } from "@/lib/peecho/quote-service";
import { z } from "zod";

const quoteRequestSchema = z.object({
  country: z.string().min(2).max(2),
  pageCount: z.number().min(1),
  offeringId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = quoteRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const quote = await getQuote({
      country: result.data.country,
      pageCount: result.data.pageCount,
      offeringId: result.data.offeringId,
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get quote" },
      { status: 500 }
    );
  }
}
