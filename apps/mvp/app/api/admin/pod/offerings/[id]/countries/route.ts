import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { peechoClient } from "@/lib/peecho/client";
import { requireAdmin } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await params;

    const offering = await db.podOffering.findUnique({
      where: { id },
      select: { externalId: true, name: true },
    });

    if (!offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 },
      );
    }

    const countries = await peechoClient.getCountries([offering.externalId]);

    return NextResponse.json({
      offeringId: id,
      externalId: offering.externalId,
      name: offering.name,
      countries: countries.sort((a, b) => a.code.localeCompare(b.code)),
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 },
    );
  }
}
