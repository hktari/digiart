import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateArtworkImage } from "@/lib/image-validation";
import { getPublicStorageUrl, getS3Bucket, s3 } from "@/lib/s3";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creatorProfile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!creatorProfile) {
    return NextResponse.json(
      { error: "Creator profile not found" },
      { status: 403 },
    );
  }

  let body: { pendingKey: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { pendingKey, title } = body;

  if (!pendingKey || !pendingKey.startsWith("uploads/pending/")) {
    return NextResponse.json({ error: "Invalid pendingKey" }, { status: 400 });
  }

  const bucket = getS3Bucket();

  let imageBuffer: Buffer;
  let fileSize: number;

  try {
    const getResult = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: pendingKey }),
    );
    imageBuffer = await streamToBuffer(getResult.Body as Readable);
    fileSize = getResult.ContentLength ?? imageBuffer.byteLength;
  } catch {
    return NextResponse.json(
      { error: "Pending file not found. Please upload the file first." },
      { status: 404 },
    );
  }

  const validation = await validateArtworkImage(imageBuffer, fileSize);

  if (!validation.valid) {
    await s3
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: pendingKey }))
      .catch(() => {});
    return NextResponse.json(
      { error: validation.code, message: validation.message },
      { status: 400 },
    );
  }

  const ext = validation.mimeType === "image/jpeg" ? "jpg" : "png";
  const finalKey = `artworks/${randomUUID()}.${ext}`;

  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${pendingKey}`,
      Key: finalKey,
    }),
  );

  await s3
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: pendingKey }))
    .catch(() => {});

  const storageUrl = getPublicStorageUrl(finalKey);

  const artwork = await db.artwork.create({
    data: {
      creatorProfileId: creatorProfile.id,
      title: title?.trim() || "Untitled",
      storageKey: finalKey,
      mimeType: validation.mimeType,
      fileSize,
      width: validation.width,
      height: validation.height,
      orientation: validation.orientation,
    },
  });

  return NextResponse.json(
    {
      artwork,
      storageUrl,
      warnings: validation.warnings,
    },
    { status: 201 },
  );
}
