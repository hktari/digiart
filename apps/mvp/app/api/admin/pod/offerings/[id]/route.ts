import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const offeringUpdateSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    
    const body = await request.json();
    const result = offeringUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const offering = await db.podOffering.update({
      where: { id: params.id },
      data: { isActive: result.data.isActive },
    });
    
    return NextResponse.json(offering);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update offering" },
      { status: 500 }
    );
  }
}
