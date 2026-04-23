import { S3Client } from "@aws-sdk/client-s3";

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

export const s3 = new Proxy({} as S3Client, {
  get(_target, prop) {
    return (getS3Client() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
