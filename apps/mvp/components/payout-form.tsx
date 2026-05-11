"use client";

import { useActionState } from "react";
import { savePayoutProfile } from "@/lib/actions/creator";

interface PayoutFormProps {
  initialData?: {
    legalName?: string | null;
    paypalEmail?: string | null;
    isReady?: boolean;
  };
}

export function PayoutForm({ initialData }: PayoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    savePayoutProfile,
    null,
  );

  const success = state?.success === true;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="legalName"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Legal name
          <span className="ml-1 text-muted-foreground font-normal">
            (optional)
          </span>
        </label>
        <input
          id="legalName"
          name="legalName"
          type="text"
          defaultValue={initialData?.legalName ?? ""}
          placeholder="Your full legal name"
          className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="paypalEmail"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          PayPal email
          <span className="ml-1 text-muted-foreground font-normal">
            (required for payouts)
          </span>
        </label>
        <input
          id="paypalEmail"
          name="paypalEmail"
          type="email"
          defaultValue={initialData?.paypalEmail ?? ""}
          placeholder="paypal@example.com"
          className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
        />
        {!success && state?.errors?.paypalEmail && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.paypalEmail}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Save payout info"}
        </button>
        {success && (
          <p className="text-xs text-jade-600 font-medium">✓ Saved</p>
        )}
        {initialData?.isReady && !success && (
          <span className="text-xs text-jade-600">✓ Payout ready</span>
        )}
      </div>
    </form>
  );
}
