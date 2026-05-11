"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { CART_SUMMARY_KEY } from "@/components/collector-booklet-cart";
import { subscribeToCreatorAction } from "@/lib/actions/collector";

type Props = {
  creatorSlug: string;
  creatorProfileId: string;
  referralCode?: string;
  isAuthenticated: boolean;
  className?: string;
};

export function CollectorSubscribeButton({
  creatorSlug,
  creatorProfileId,
  referralCode,
  isAuthenticated,
  className,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubscribe = () => {
    if (!isAuthenticated) {
      const subscribeUrl = referralCode
        ? `/creators/${creatorSlug}/subscribe?ref=${referralCode}`
        : `/creators/${creatorSlug}/subscribe`;
      router.push(subscribeUrl);
      return;
    }

    startTransition(async () => {
      const result = await subscribeToCreatorAction(
        creatorProfileId,
        referralCode,
      );

      if (result.success) {
        mutate(CART_SUMMARY_KEY);
        router.refresh();
        if (result.autoAssignedReleaseTitle) {
          toast.success("Subscribed", {
            description: `Added "${result.autoAssignedReleaseTitle}" to your booklet.`,
          });
        } else if (result.autoAssignmentSkipped) {
          toast.success("Subscribed", {
            description:
              "Your booklet is at the current maximum — no release was auto-added.",
          });
        } else {
          toast.success("Subscribed");
        }
        return;
      }

      if ("needsSetup" in result) {
        const setupParams = new URLSearchParams({ creator: creatorProfileId });
        if (referralCode) setupParams.set("ref", referralCode);
        router.push(`/collector/setup?${setupParams.toString()}`);
        return;
      }

      if ("error" in result) {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onSubscribe}
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 transition-colors text-base disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      {isPending ? "Subscribing..." : "Subscribe — get their prints delivered"}
      <span className="text-lg">{isPending ? "⏳" : "→"}</span>
    </button>
  );
}
