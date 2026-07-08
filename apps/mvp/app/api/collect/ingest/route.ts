import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestCollect } from "@/lib/collect/ingest-service";
import { logger } from "@/lib/logger";

// Public, unauthenticated write (same trust model as a newsletter signup):
// the Threads Collect extension posts here cross-origin, so CORS is open.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const imageSchema = z.object({
  url: z.string().url(),
  imageId: z.string().min(1).max(300),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  ext: z.string().max(8).nullish(),
});

const payloadSchema = z.object({
  token: z.string().min(8).max(100),
  handle: z.string().min(1).max(100),
  postUrl: z.string().url().nullish(),
  caption: z.string().max(2000).nullish(),
  images: z.array(imageSchema).min(1).max(20),
});

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const result = await ingestCollect(parsed.data);
    return NextResponse.json(result, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    logger.error("[collect] ingest failed", { error });
    return NextResponse.json(
      { error: "Ingest failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
