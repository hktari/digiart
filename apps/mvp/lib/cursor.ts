/**
 * Cursor encoding/decoding utilities for cursor-based pagination.
 * Uses composite cursor of { createdAt, id } for stable, monotonic ordering.
 */

export type Cursor = {
  createdAt: string;
  id: string;
};

/**
 * Encode a cursor object to a base64 string.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  const cursor: Cursor = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * Decode a base64 cursor string back to a cursor object.
 * Returns null if the cursor is malformed or expired.
 */
export function decodeCursor(cursor: string | null): Cursor | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "createdAt" in parsed &&
      "id" in parsed &&
      typeof (parsed as Cursor).createdAt === "string" &&
      typeof (parsed as Cursor).id === "string"
    ) {
      // Validate that createdAt is a valid date
      const date = new Date((parsed as Cursor).createdAt);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}
