import { redirect } from "next/navigation";
import { PricingQuoteDisplay } from "@/components/pricing-quote-display";
import { fetchAndPersistQuote } from "@/lib/actions/pricing-actions";
import { auth } from "@/lib/auth";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";
import { getLatestQuote } from "@/lib/pricing/quote-snapshot";

export default async function CollectorPricingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const currentCycle = await getCurrentCycle();

  let latestQuote: {
    shippingAmount: number;
    productAmount: number;
    taxAmount: number;
    totalEstimate: number;
    currency: string;
    quotedAt: Date;
  } | null = null;
  if (currentCycle) {
    const quote = await getLatestQuote(collectorProfile.id, currentCycle.id);
    if (quote) {
      latestQuote = {
        shippingAmount: Number(quote.shippingAmount),
        productAmount: Number(quote.productAmount),
        taxAmount: Number(quote.taxAmount),
        totalEstimate: Number(quote.totalEstimate),
        currency: quote.currency,
        quotedAt: quote.quotedAt,
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing Estimate</h1>
        <p className="text-gray-600 mt-1">
          Your estimated monthly booklet cost based on current selections
        </p>
      </div>

      {!collectorProfile.shippingCountry ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          Please set your shipping country in{" "}
          <a href="/collector/setup" className="underline font-medium">
            profile settings
          </a>{" "}
          to get a pricing estimate.
        </div>
      ) : !currentCycle ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No active subscription cycle available.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This is an estimate based on a default page
              count of 20 pages. Your actual cost will depend on your final
              selections and the number of pages in your booklet.
            </p>
          </div>

          <PricingQuoteDisplay
            initialQuote={latestQuote}
            onRefresh={async () => {
              "use server";
              return fetchAndPersistQuote(20);
            }}
          />
        </>
      )}
    </div>
  );
}
