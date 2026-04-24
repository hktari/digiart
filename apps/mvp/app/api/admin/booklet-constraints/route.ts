import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const constraintSchema = z.object({
  minPages: z.number().min(1),
  maxPages: z.number().min(1),
  maxCreators: z.number().optional(),
  maxReleases: z.number().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.minPages < data.maxPages,
  { message: "Minimum pages must be less than maximum pages" }
);

export async function GET() {
  try {
    await requireAdmin();
    
    const constraints = await db.bookletConstraint.findMany({
      orderBy: { version: "desc" },
    });
    
    return NextResponse.json(constraints);
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    
    const body = await request.json();
    const result = constraintSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    if (result.data.isActive) {
      await db.bookletConstraint.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    
    const latestVersion = await db.bookletConstraint.findFirst({
      orderBy: { version: "desc" },
    });
    
    const constraint = await db.bookletConstraint.create({
      data: {
        ...result.data,
        version: (latestVersion?.version ?? 0) + 1,
      },
    });
    
    return NextResponse.json(constraint, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create constraint" },
      { status: 500 }
    );
  }
}
