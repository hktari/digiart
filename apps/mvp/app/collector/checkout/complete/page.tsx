import { Calendar, CheckCircle, CreditCard, Package, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type SearchParams = {
  mode?: string;
};

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isImmediateMode = resolvedSearchParams.mode === "immediate";

  const currentCycle = await getCurrentCycle();

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const checkoutIntent =
    collectorProfile && currentCycle
      ? await db.checkoutIntent.findUnique({
          where: {
            collectorProfileId_cycleId: {
              collectorProfileId: collectorProfile.id,
              cycleId: currentCycle.id,
            },
          },
          select: {
            committedAt: true,
            orderedManually: true,
            orderedAt: true,
            retailTotalAmount: true,
          },
        })
      : null;

  if (!checkoutIntent) {
    redirect("/collector/checkout");
  }

  // Determine the mode based on query param OR checkout intent
  const isOrderedImmediately =
    isImmediateMode ||
    (checkoutIntent.orderedManually && checkoutIntent.orderedAt);

  const lockDateFormatted = currentCycle?.lockDate
    ? new Date(currentCycle.lockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const orderedAtFormatted = checkoutIntent.orderedAt
    ? new Date(checkoutIntent.orderedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const amountFormatted = checkoutIntent.retailTotalAmount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
      }).format(Number(checkoutIntent.retailTotalAmount))
    : null;

  // State A — Committed (charged at lock, default)
  if (!isOrderedImmediately) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-jade-100 p-4">
              <CheckCircle className="h-10 w-10 text-jade-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Booklet committed!
          </h1>
          <p className="text-sm text-muted-foreground/60">
            Your card has been saved. You&apos;ll be charged{" "}
            {lockDateFormatted ? `on ${lockDateFormatted}` : "at cycle lock"}.
          </p>
        </div>

        <div className="rounded-lg border border-beige-200 bg-white divide-y divide-beige-100">
          {lockDateFormatted && (
            <div className="flex items-start gap-3 p-4">
              <Calendar className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Charge date
                </p>
                <p className="text-sm text-muted-foreground/60">
                  {lockDateFormatted}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 p-4">
            <CreditCard className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Payment</p>
              <p className="text-sm text-muted-foreground/60">
                Your saved card will be charged automatically at cycle lock. No
                action needed.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-jade-200 bg-jade-50 p-4 text-sm text-jade-700">
          <p className="font-medium mb-1">You can still change selections</p>
          <p>
            You can add or remove releases until the cycle closes
            {lockDateFormatted ? ` on ${lockDateFormatted}` : ""}. The final
            price will be recalculated based on your selections at that time.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/collector/releases"
            className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Continue browsing releases
          </Link>
          <Link
            href="/collector"
            className="w-full rounded-lg border border-beige-200 px-4 py-3 text-center text-sm font-medium text-muted-foreground/70 hover:bg-beige-50 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // State B — Ordered Now (immediate charge)
  return (
    <div className="max-w-xl mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="rounded-full bg-fuchsia-100 p-4">
            <Zap className="h-10 w-10 text-fuchsia-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Booklet ordered!</h1>
        <p className="text-sm text-muted-foreground/60">
          Your card has been charged. Your booklet is being prepared.
        </p>
      </div>

      <div className="rounded-lg border border-beige-200 bg-white divide-y divide-beige-100">
        <div className="flex items-start gap-3 p-4">
          <Calendar className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Order date</p>
            <p className="text-sm text-muted-foreground/60">
              {orderedAtFormatted ?? "Today"}
            </p>
          </div>
        </div>
        {amountFormatted && (
          <div className="flex items-start gap-3 p-4">
            <CreditCard className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Amount charged
              </p>
              <p className="text-sm text-muted-foreground/60">
                {amountFormatted}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3 p-4">
          <Package className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="text-sm text-muted-foreground/60">
              Your booklet is being printed and will ship soon.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-700">
        <p className="font-medium mb-1">Selections are locked</p>
        <p>
          You have already placed your order. Your selections cannot be changed
          for this cycle. Track your order in My Orders.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/collector/orders"
          className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
        >
          View my orders
        </Link>
        <Link
          href="/collector"
          className="w-full rounded-lg border border-beige-200 px-4 py-3 text-center text-sm font-medium text-muted-foreground/70 hover:bg-beige-50 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
