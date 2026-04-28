import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getS3Bucket } from "./s3";

interface CleanupResult {
  deleted: number;
  errors: number;
  keys: string[];
}

/**
 * Clean up pending uploads older than a specified age.
 * Pending uploads are temporary files in `uploads/pending/` that may be
 * abandoned if users start but don't complete the artwork registration flow.
 *
 * Railway S3 does not support lifecycle rules, so this must be run periodically.
 *
 * @param maxAgeHours - Maximum age in hours before a pending upload is deleted (default: 24)
 * @returns CleanupResult with count of deleted files and any errors
 */
export async function cleanupPendingUploads(
  maxAgeHours: number = 24,
): Promise<CleanupResult> {
  const bucket = getS3Bucket();
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT_URL;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required S3 environment variables");
  }

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint && { endpoint, forcePathStyle: true }),
  });

  const result: CleanupResult = { deleted: 0, errors: 0, keys: [] };

  // Calculate cutoff date
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  try {
    // List all objects in uploads/pending/
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "uploads/pending/",
    });

    const listResponse = await s3.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return result;
    }

    // Filter objects older than cutoff
    const oldObjects = listResponse.Contents.filter(
      (obj) => obj.LastModified && obj.LastModified < cutoffDate,
    );

    // Delete old objects
    for (const obj of oldObjects) {
      if (!obj.Key) continue;

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: obj.Key,
          }),
        );
        result.deleted++;
        result.keys.push(obj.Key);
      } catch {
        result.errors++;
      }
    }

    return result;
  } catch {
    return result;
  }
}
