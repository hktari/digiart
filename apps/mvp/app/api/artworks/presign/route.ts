import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getS3Bucket, s3 } from "@/lib/s3";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

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

  let body: { contentType: string; fileSize: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { contentType, fileSize } = body;

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      {
        error: "INVALID_FORMAT",
        message: "Only JPEG and PNG files are accepted.",
      },
      { status: 400 },
    );
  }

  if (!fileSize || fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: "File must be under 50 MB.",
      },
      { status: 400 },
    );
  }

  const ext = contentType === "image/jpeg" ? "jpg" : "png";
  const uuid = randomUUID();
  const pendingKey = `uploads/pending/${uuid}.${ext}`;
  const bucket = getS3Bucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: pendingKey,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return NextResponse.json({ uploadUrl, pendingKey });
}
