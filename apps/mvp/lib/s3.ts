import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing required S3 environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
    );
  }

  const endpoint = process.env.AWS_ENDPOINT_URL;

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint && {
      endpoint,
      forcePathStyle: true,
    }),
  });
}

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("Missing required S3 environment variable: AWS_S3_BUCKET");
  }
  return bucket;
}

export function getPublicStorageUrl(key: string): string {
  const bucket = getS3Bucket();
  const endpoint = process.env.AWS_ENDPOINT_URL;
  if (endpoint) {
    // MinIO - use path-style URL
    return `${endpoint}/${bucket}/${key}`;
  }
  // AWS S3 - use virtual-hosted style
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

/**
 * Extracts the S3 key from a stored storage URL.
 * Supports both Railway S3/MinIO (path-style) and AWS S3 (virtual-hosted) URLs.
 */
export function extractKeyFromStorageUrl(url: string): string | null {
  const bucket = getS3Bucket();
  const endpoint = process.env.AWS_ENDPOINT_URL;

  try {
    const urlObj = new URL(url);

    if (endpoint) {
      // Railway S3 / MinIO path-style: https://endpoint/bucket/key
      const pathPrefix = `/${bucket}/`;
      if (urlObj.pathname.startsWith(pathPrefix)) {
        return urlObj.pathname.slice(pathPrefix.length);
      }
    } else {
      // AWS S3 virtual-hosted: https://bucket.s3.amazonaws.com/key
      const hostPrefix = `${bucket}.s3`;
      if (urlObj.hostname.startsWith(hostPrefix)) {
        return urlObj.pathname.slice(1); // Remove leading /
      }
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Generates a presigned GET URL for accessing a private S3 object.
 * Valid for 14 days (1209600 seconds) by default.
 */
export async function getPresignedGetUrl(
  key: string,
  expiresInSeconds: number = 14 * 24 * 60 * 60, // 14 days
): Promise<string> {
  const bucket = getS3Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

/**
 * Primary URL resolver for serving storage objects.
 * Always uses presigned URLs (1 hour TTL) since the bucket is private.
 */
export async function getPresignedStorageUrl(key: string): Promise<string> {
  return getPresignedGetUrl(key, 60 * 60); // 1 hour
}

/**
 * Resolves the S3 key from an avatar field value.
 * Handles both legacy full-URL values and new key-only values.
 * Returns null if the value cannot be resolved to a key.
 */
export function extractAvatarKey(avatarFieldValue: string): string | null {
  if (avatarFieldValue.startsWith("avatars/")) {
    return avatarFieldValue;
  }
  return extractKeyFromStorageUrl(avatarFieldValue);
}

/**
 * Resolves an avatar field value (key or legacy full URL) to a presigned URL.
 */
export async function resolveAvatarUrl(
  avatarFieldValue: string,
): Promise<string | null> {
  const key = extractAvatarKey(avatarFieldValue);
  if (!key) return null;
  return getPresignedStorageUrl(key);
}

export const s3 = new Proxy({} as S3Client, {
  get(_target, prop) {
    return (getS3Client() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
