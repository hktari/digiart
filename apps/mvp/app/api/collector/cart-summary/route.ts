import { NextResponse } from "next/server";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getCollectorCartSummary(session.user.id);
  return NextResponse.json(summary);
}
