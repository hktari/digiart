"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { unsubscribeFromCreator } from "@/lib/actions/collector";
import { dispatchCollectorCartUpdated } from "@/lib/cart-events";

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
      dispatchCollectorCartUpdated();
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onUnsubscribe}
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "Unsubscribing..." : "Unsubscribe"}
    </button>
  );
}
