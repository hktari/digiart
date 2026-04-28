import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";
import type { PodProviderConfig } from "@prisma/client";

export async function GET(): Promise<NextResponse> {
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
  } catch (_error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
