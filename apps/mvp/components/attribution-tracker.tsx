"use client";

import { useEffect } from "react";
import { captureAttributionAction } from "@/lib/actions/analytics";

/**
 * Client component that captures attribution data on mount.
 *
 * This must be a client component because cookie modification is only allowed
 * in Server Actions invoked from the client, not during Server Component rendering.
 *
 * Usage: place inside the page layout (does not render any DOM).
 */
export function AttributionTracker({
  searchParams,
  pathname,
}: {
  searchParams: Record<string, string>;
  pathname: string;
}) {
  useEffect(() => {
    void captureAttributionAction(searchParams, pathname);
  }, [searchParams, pathname]);

  return null;
}
