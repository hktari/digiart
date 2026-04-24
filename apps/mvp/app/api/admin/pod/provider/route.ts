import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export async function GET() {
  try {
    await requireAdmin();
    
    const provider = await db.podProviderConfig.findFirst({
      where: { provider: "Peecho" },
      include: {
        offerings: {
          orderBy: { name: "asc" },
        },
      },
    });
    
    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
