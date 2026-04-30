import Link from "next/link";
import { redirect } from "next/navigation";
import { getCollectorCartSummary } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";

export default async function CollectorCheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const summary = await getCollectorCartSummary(session.user.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upcoming Cycle Subscription</h1>
        <p className="text-neutral-600 mt-1">
          Confirm booklet eligibility for the upcoming cycle.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-2">
        <p className="text-sm text-neutral-600">
          Selected artworks:{" "}
          <span className="font-semibold text-neutral-900">
            {summary.totalArtworks}
          </span>{" "}
          ({summary.minRequired}-{summary.maxAllowed} required)
        </p>
        <p className="text-sm text-neutral-600">
          Subscribed creators:{" "}
          <span className="font-semibold text-neutral-900">
            {summary.totalSubscribedCreators}
          </span>{" "}
          ({summary.minSubscribedCreators}-{summary.maxSubscribedCreators}{" "}
          required)
        </p>
      </div>

      {!summary.isValidForCheckout && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Your booklet is not yet eligible. Adjust selections in your collector
          cart before subscribing for the cycle.
        </div>
      )}

      {summary.isValidForCheckout && (
        <div className="rounded-lg border border-jade-300 bg-jade-50 p-4 text-sm text-jade-800">
          Your booklet is eligible. Payment/fulfillment confirmation will be
          connected in Sprint 6.
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/collector/releases"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to selections
        </Link>
      </div>
    </div>
  );
}
