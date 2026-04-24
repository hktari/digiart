import { NextResponse } from "next/server";
import { syncPeechoOfferings } from "@/lib/peecho/offering-sync";
import { requireAdmin } from "@/lib/roles";

export async function POST() {
  try {
    await requireAdmin();

    const result = await syncPeechoOfferings();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully synced ${result.syncedCount} offerings`,
        syncedCount: result.syncedCount,
      });
    }

    return NextResponse.json(
      { error: result.error || "Failed to sync offerings" },
      { status: 500 },
    );
  } catch (_error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
