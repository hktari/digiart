"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { mutate } from "swr";
import { CART_SUMMARY_KEY } from "@/components/collector-booklet-cart";
import { unsubscribeFromCreator } from "@/lib/actions/collector";

type Props = {
  subscriptionId: string;
};

export function CollectorUnsubscribeButton({ subscriptionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onUnsubscribe = () => {
    startTransition(async () => {
      const result = await unsubscribeFromCreator(subscriptionId);
      if (!result.success) return;
      mutate(CART_SUMMARY_KEY);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onUnsubscribe}
      disabled={isPending}
      className="text-xs font-medium text-destructive-foreground hover:opacity-80 disabled:opacity-50"
    >
      {isPending ? "Unsubscribing..." : "Unsubscribe"}
    </button>
  );
}
