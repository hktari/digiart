"use client";

import { AlertTriangle, Archive, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { archiveRelease, publishRelease } from "@/lib/actions/releases";
import { Button } from "./ui/button";

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
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handlePublishConfirm = () => {
    setShowPublishDialog(false);

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

  const handleArchiveConfirm = () => {
    setShowArchiveDialog(false);

    startTransition(async () => {
      const result = await archiveRelease(releaseId);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    setShowArchiveDialog(true);
  };

  return (
    <div className="flex items-center gap-3">
      {status === "DRAFT" && (
        <>
          {artworkCount < 5 && (
            <p className="text-xs text-warning-foreground">
              {artworkCount === 0
                ? "Add at least 5 artworks to publish."
                : `${5 - artworkCount} more artwork${5 - artworkCount === 1 ? "" : "s"} needed to publish.`}
            </p>
          )}
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={isPending || artworkCount < 5}
          >
            <Rocket className="mr-2 h-4 w-4" />
            {isPending ? "Publishing…" : "Publish"}
          </Button>
        </>
      )}
      {status === "PUBLISHED" && (
        <Button variant="outline" onClick={handleArchive} disabled={isPending}>
          <Archive className="mr-2 h-4 w-4" />
          {isPending ? "Archiving…" : "Archive"}
        </Button>
      )}
      {status === "ARCHIVED" && (
        <span className="text-sm text-muted-foreground">Archived</span>
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-warning-bg p-2">
                <AlertTriangle className="h-5 w-5 text-warning-foreground" />
              </div>
              <DialogTitle>Publish Release?</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Once published, this release <strong>cannot be edited</strong>.
              Collectors who selected this release will receive exactly these
              artworks in their booklet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowPublishDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishConfirm}
              disabled={isPending}
              className="bg-success-bg text-success-foreground border border-success-border hover:opacity-90"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {isPending ? "Publishing…" : "Publish Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
              </div>
              <DialogTitle>Archive Release?</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              This release will no longer be visible to collectors. You cannot
              re-publish an archived release.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleArchiveConfirm}
              disabled={isPending}
            >
              <Archive className="mr-2 h-4 w-4" />
              {isPending ? "Archiving…" : "Archive Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
