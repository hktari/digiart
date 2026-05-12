"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { createRelease, updateRelease } from "@/lib/actions/releases";
import { TagInput } from "./tag-input";

type SaveAction = typeof createRelease | typeof updateRelease;

interface ReleaseFormProps {
  action: SaveAction;
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    tags?: string[];
  };
  submitLabel?: string;
}

export function ReleaseForm({
  action,
  initialData,
  submitLabel = "Save draft",
}: ReleaseFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);

  useEffect(() => {
    if (state?.success) {
      router.push(`/creator/releases/${state.releaseId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5">
      {initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initialData?.title ?? ""}
          placeholder="e.g. Issue #3 — Summer Landscapes"
          className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
        />
        {!state?.success && state?.errors?.title && (
          <p className="mt-1 text-xs text-red-600">{state.errors.title}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Description
          <span className="ml-1 text-muted-foreground font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialData?.description ?? ""}
          placeholder="What's this release about? Notes for subscribers, theme, etc."
          className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none"
        />
        {!state?.success && state?.errors?.description && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.description}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="tags-input"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Tags
          <span className="ml-1 text-muted-foreground font-normal">
            (optional)
          </span>
        </label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Add tags..."
          id="tags-input"
        />
        <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      </div>

      {!state?.success &&
        state?.errors &&
        Object.keys(state.errors).length > 0 &&
        !state.errors.title &&
        !state.errors.description && (
          <p className="text-sm text-red-600">
            {Object.values(state.errors)[0]}
          </p>
        )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
