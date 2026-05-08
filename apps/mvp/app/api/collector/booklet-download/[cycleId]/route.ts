import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractKeyFromStorageUrl, getPresignedGetUrl } from "@/lib/s3";

// Presigned URL valid for 1 hour (3600 seconds)
const DOWNLOAD_URL_EXPIRY_SECONDS = 60 * 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cycleId } = await params;

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!collectorProfile) {
    return NextResponse.json(
      { error: "Collector profile not found" },
      { status: 404 },
    );
  }

  // Find the generated print file for this collector and cycle
  const printFile = await db.generatedPrintFile.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: collectorProfile.id,
        cycleId,
      },
    },
    include: {
      cycle: { select: { label: true } },
    },
  });

  if (!printFile) {
    return NextResponse.json({ error: "Booklet not found" }, { status: 404 });
  }

  if (printFile.status !== "READY") {
    return NextResponse.json(
      { error: "Booklet is not ready for download yet" },
      { status: 409 },
    );
  }

  if (!printFile.storageUrl) {
    return NextResponse.json(
      { error: "Booklet file not available" },
      { status: 404 },
    );
  }

  // Extract S3 key and generate presigned URL
  const key = extractKeyFromStorageUrl(printFile.storageUrl);
  if (!key) {
    return NextResponse.json(
      { error: "Failed to locate booklet file" },
      { status: 500 },
    );
  }

  try {
    const downloadUrl = await getPresignedGetUrl(
      key,
      DOWNLOAD_URL_EXPIRY_SECONDS,
    );

    return NextResponse.json({
      downloadUrl,
      filename: `booklet-${printFile.cycle.label || cycleId}.pdf`,
      expiresInSeconds: DOWNLOAD_URL_EXPIRY_SECONDS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate download link", details: message },
      { status: 500 },
    );
  }
}
