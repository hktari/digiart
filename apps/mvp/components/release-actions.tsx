"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useTransition } from "react";
import { archiveRelease, publishRelease } from "@/lib/actions/releases";

interface ReleaseActionsProps {
  releaseId: string;
  status: string;
  artworkCount: number;
}

export function ReleaseActions({
  releaseId,
  status,
  artworkCount,
}: ReleaseActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishRelease(releaseId);
      if (!result.success) {
        alert(result.error);
      } else {
        posthog.capture("creator_release_published", { release_id: releaseId });
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    if (
      !confirm(
        "Archive this release? It will no longer be visible to collectors.",
      )
    )
      return;
    startTransition(async () => {
      const result = await archiveRelease(releaseId);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {status === "DRAFT" && (
        <>
          {artworkCount < 5 && (
            <p className="text-xs text-beige-600">
              {artworkCount === 0
                ? "Add at least 5 artworks to publish."
                : `${5 - artworkCount} more artwork${5 - artworkCount === 1 ? "" : "s"} needed to publish.`}
            </p>
          )}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending || artworkCount < 5}
            className="rounded-lg bg-jade-600 px-4 py-2 text-sm font-semibold text-white hover:bg-jade-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Publishing…" : "Publish"}
          </button>
        </>
      )}
      {status === "PUBLISHED" && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Archiving…" : "Archive"}
        </button>
      )}
      {status === "ARCHIVED" && (
        <span className="text-sm text-neutral-400">Archived</span>
      )}
    </div>
  );
}
