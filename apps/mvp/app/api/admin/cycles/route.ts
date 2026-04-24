import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const cycleSchema = z.object({
  label: z.string().min(1),
  month: z.number().min(1).max(12),
  year: z.number().min(2024),
  selectionOpenDate: z.string().datetime(),
  lockDate: z.string().datetime(),
  fulfillmentDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.selectionOpenDate) < new Date(data.lockDate),
  { message: "Selection open date must be before lock date" }
).refine(
  (data) => new Date(data.lockDate) < new Date(data.fulfillmentDate),
  { message: "Lock date must be before fulfillment date" }
);

export async function GET() {
  try {
    await requireAdmin();
    
    const cycles = await db.subscriptionCycle.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    
    return NextResponse.json(cycles);
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
    const result = cycleSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const existing = await db.subscriptionCycle.findUnique({
      where: {
        month_year: {
          month: result.data.month,
          year: result.data.year,
        },
      },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "A cycle for this month and year already exists" },
        { status: 400 }
      );
    }
    
    const cycle = await db.subscriptionCycle.create({
      data: {
        label: result.data.label,
        month: result.data.month,
        year: result.data.year,
        selectionOpenDate: new Date(result.data.selectionOpenDate),
        lockDate: new Date(result.data.lockDate),
        fulfillmentDate: new Date(result.data.fulfillmentDate),
      },
    });
    
    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
