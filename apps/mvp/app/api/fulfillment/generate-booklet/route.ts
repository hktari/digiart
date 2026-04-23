import { Queue } from "bullmq";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getBookletQueue() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Queue("booklet-generation", {
    connection: { url: redisUrl },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await db.userRole.findMany({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const isAdmin = roles.some((r) => r.role === "ADMIN");
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  let body: { collectorProfileId: string; cycleId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { collectorProfileId, cycleId } = body;
  if (!collectorProfileId || !cycleId) {
    return NextResponse.json(
      { error: "collectorProfileId and cycleId are required" },
      { status: 400 },
    );
  }

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
    select: { label: true, month: true, year: true },
  });
  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  const existing = await db.generatedPrintFile.findUnique({
    where: { collectorProfileId_cycleId: { collectorProfileId, cycleId } },
  });

  if (existing && existing.status === "READY") {
    return NextResponse.json(
      { message: "Booklet already generated", pdfUrl: existing.storageUrl },
      { status: 200 },
    );
  }

  await db.generatedPrintFile.upsert({
    where: { collectorProfileId_cycleId: { collectorProfileId, cycleId } },
    update: { status: "PENDING", errorMessage: null },
    create: { collectorProfileId, cycleId, status: "PENDING" },
  });

  const issueLabel = `${cycle.label} ${cycle.year}`;
  const queue = getBookletQueue();
  const job = await queue.add(
    "generate",
    { collectorProfileId, cycleId, issueLabel },
    { jobId: `booklet-${collectorProfileId}-${cycleId}` },
  );
  await queue.close();

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
