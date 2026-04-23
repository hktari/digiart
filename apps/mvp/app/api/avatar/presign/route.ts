import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getS3Bucket, s3 } from "@/lib/s3";
import { randomUUID } from "node:crypto";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { contentType, fileSize } = body;

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG and WebP files are accepted." },
      { status: 400 },
    );
  }

  if (!fileSize || fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File must be under 5 MB." },
      { status: 400 },
    );
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `avatars/${creatorProfile.id}/${randomUUID()}.${ext}`;
  const bucket = getS3Bucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 120 });

  return NextResponse.json({ uploadUrl, key });
}
