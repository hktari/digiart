import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

const constraintUpdateSchema = z.object({
  minPages: z.number().min(1).optional(),
  maxPages: z.number().min(1).optional(),
  maxCreators: z.number().optional(),
  maxReleases: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const constraint = await db.bookletConstraint.findUnique({
      where: { id: params.id },
    });

    if (!constraint) {
      return NextResponse.json(
        { error: "Constraint not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(constraint);
  } catch (_error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const result = constraintUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    if (result.data.isActive) {
      await db.bookletConstraint.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false },
      });
    }

    const constraint = await db.bookletConstraint.update({
      where: { id: params.id },
      data: result.data,
    });

    return NextResponse.json(constraint);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update constraint" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    await db.bookletConstraint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to delete constraint" },
      { status: 500 },
    );
  }
}
