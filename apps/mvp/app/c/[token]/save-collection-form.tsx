"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SaveCollectionEmailState } from "@/lib/collect/actions";

type Props = {
  action: (
    state: SaveCollectionEmailState,
    formData: FormData,
  ) => Promise<NonNullable<SaveCollectionEmailState>>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Sending…" : "Save"}
    </Button>
  );
}

/**
 * Client component purely so the form can report back. As a bare server-action
 * form it rendered identically before and after submitting, which made a
 * working save look like a dead button.
 */
export function SaveCollectionForm({ action }: Props) {
  const [state, formAction] = useActionState(action, null);

  if (state?.status === "sent") {
    return (
      <div className="mb-10 rounded-xl border border-border bg-card p-4 text-sm text-jade-700 dark:text-jade-400">
        {state.message}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-10 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor="email"
          className="text-sm text-muted-foreground sm:mr-2"
        >
          Save your collection — we&apos;ll email you the link:
        </label>
        <div className="flex flex-1 gap-2">
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="flex-1"
          />
          <SubmitButton />
        </div>
      </div>
      {/* "sent" returned above, so anything left here is a failure. */}
      {state && (
        <p
          role="status"
          className="mt-2 text-sm text-fuchsia-700 dark:text-fuchsia-400"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
