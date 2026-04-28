import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";
import type { PodOffering } from "@prisma/client";

const offeringUpdateSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const result = offeringUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    const offering = await db.podOffering.update({
      where: { id },
      data: { isActive: result.data.isActive },
    });

    return NextResponse.json(offering);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update offering" },
      { status: 500 },
    );
  }
}
