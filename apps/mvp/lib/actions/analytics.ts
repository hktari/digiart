"use server";

import { captureAttribution as captureAttributionLib } from "@/lib/analytics/attribution";

/**
 * Server Action to capture attribution data.
 * This must be a Server Action because it modifies cookies (setting anon_id).
 */
export async function captureAttributionAction(
  searchParams: Record<string, string>,
  pathname: string,
): Promise<void> {
  const searchParamsObj = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    searchParamsObj.set(key, value);
  }
  await captureAttributionLib(searchParamsObj, pathname);
}
