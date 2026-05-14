"use client";

import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, Info, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveQuote } from "@/lib/actions/pricing-actions";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  { developerTools: { assistant: { enabled: false } } },
);

interface EstimateSummary {
  baseAmount: number;
  shippingAmount: number;
  markupAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
}

interface ExactPrice {
  amount: number;
  currency: string;
}

interface DefaultAddress {
  name?: string;
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface CheckoutPaymentFormProps {
  cycleLockDate: string | null;
  estimateSummary: EstimateSummary | null;
  defaultAddress: DefaultAddress | null;
  allowedCountries: string[];
}

interface CheckoutFormInnerProps extends CheckoutPaymentFormProps {
  liveEstimate: EstimateSummary | null;
  isRefreshingEstimate: boolean;
  onEstimateChange: (estimate: EstimateSummary | null) => void;
  onRefreshingChange: (refreshing: boolean) => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

function EstimateBlock({
  estimate,
  cycleLockDate,
  isRefreshing,
}: {
  estimate: EstimateSummary;
  cycleLockDate: string | null;
  isRefreshing?: boolean;
}) {
  const lockDate = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50">
          Price Estimate
        </h2>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <RefreshCw className="h-3 w-3 text-warning-foreground animate-spin" />
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider text-warning-foreground bg-warning-bg border border-warning-border rounded px-1.5 py-0.5">
            Estimate
          </span>
        </div>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground/70">
        <span>Production</span>
        <span>{formatCurrency(estimate.baseAmount, estimate.currency)}</span>
      </div>
      {estimate.shippingAmount > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground/70">
          <span>Shipping</span>
          <span>
            {formatCurrency(estimate.shippingAmount, estimate.currency)}
          </span>
        </div>
      )}
      {estimate.markupAmount > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground/70">
          <span>Platform fee</span>
          <span>
            {formatCurrency(estimate.markupAmount, estimate.currency)}
          </span>
        </div>
      )}
      {estimate.taxAmount > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground/70">
          <span>Tax</span>
          <span>{formatCurrency(estimate.taxAmount, estimate.currency)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-semibold text-foreground pt-2 border-t border-border">
        <span>Estimated total</span>
        <span>{formatCurrency(estimate.totalEstimate, estimate.currency)}</span>
      </div>
      <p className="text-xs text-warning-foreground bg-warning-bg rounded p-2 mt-1">
        This estimate is based on your current selections and delivery country.
        The final price will be recalculated at cycle lock based on your actual
        artwork count and delivery address.
        {lockDate && (
          <>
            {" "}
            Your card will not be charged until <strong>{lockDate}</strong>.
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground/60 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          You can freely change your release selections until the cycle locks.
          The price depends on the number of artworks you choose and your
          delivery country.
        </span>
      </p>
    </div>
  );
}

function ExactPriceBlock({
  exact,
  cycleLockDate,
}: {
  exact: ExactPrice;
  cycleLockDate: string | null;
}) {
  const lockDate = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-success-border bg-success-bg p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-success-foreground">
          Price Estimate
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-wider text-success-foreground bg-success-bg border border-success-border rounded px-1.5 py-0.5">
          Estimate
        </span>
      </div>
      <div className="flex justify-between text-2xl font-bold text-success-foreground">
        <span>{formatCurrency(exact.amount, exact.currency)}</span>
      </div>
      <p className="text-xs text-success-foreground">
        This is a price estimate based on your current selections and delivery
        address. You will be charged the final recalculated amount at cycle lock
        {lockDate ? ` on ${lockDate}` : ""}.{" "}
        <strong>
          Changing your release selections before then will update this amount.
        </strong>
      </p>
    </div>
  );
}

function CheckoutFormInner({
  cycleLockDate,
  estimateSummary,
  defaultAddress,
  allowedCountries,
  liveEstimate,
  isRefreshingEstimate,
  onEstimateChange,
  onRefreshingChange,
}: CheckoutFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  // step: "address+card" → calculating order → "confirm" (show exact) → "submitting" → done
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exactPrice, setExactPrice] = useState<ExactPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const lockDate = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  // Phase 1: user fills address + card, clicks "Calculate exact price"
  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elements) return;

    setError(null);
    setIsCalculating(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your details.");
      setIsCalculating(false);
      return;
    }

    const addressElement = elements.getElement(AddressElement);
    if (!addressElement) {
      setError("Address form not ready.");
      setIsCalculating(false);
      return;
    }

    const { complete, value: addressValue } = await addressElement.getValue();
    if (!complete) {
      setError("Please complete your delivery address.");
      setIsCalculating(false);
      return;
    }

    const orderRes = await fetch("/api/collector/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressValue.address }),
    });

    if (!orderRes.ok) {
      const data = await orderRes.json();
      setError(data.error ?? "Failed to calculate price.");
      setIsCalculating(false);
      return;
    }

    const orderData = await orderRes.json();
    setExactPrice(orderData.exactPrice);
    setStep("confirm");
    setIsCalculating(false);
  };

  // Phase 2: user sees exact price, clicks "Confirm & save card"
  const handleConfirm = async (options?: { redirect: boolean }) => {
    if (!stripe || !elements) return false;

    setError(null);
    setIsSubmitting(true);

    const setupRes = await fetch("/api/collector/setup-intent", {
      method: "POST",
    });
    if (!setupRes.ok) {
      const data = await setupRes.json();
      setError(data.error ?? "Failed to initialize payment setup.");
      setIsSubmitting(false);
      return false;
    }
    const { clientSecret } = await setupRes.json();

    const { setupIntent, error: confirmError } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/collector/checkout/complete`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Card setup failed.");
      setIsSubmitting(false);
      return false;
    }

    if (setupIntent?.status === "succeeded") {
      const confirmRes = await fetch("/api/collector/confirm-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json();
        setError(data.error ?? "Failed to finalise order.");
        setIsSubmitting(false);
        return false;
      }

      // Redirect unless explicitly disabled (when called from handleOrderNow)
      if (options?.redirect !== false) {
        router.push("/collector/checkout/complete");
      }

      return true;
    }
    return false;
  };

  // Phase 3: user clicks "Order Now" — save card then charge immediately
  const handleOrderNow = async () => {
    const confirmed = await handleConfirm({ redirect: false });
    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

    // Now charge immediately
    const chargeRes = await fetch("/api/collector/charge-now", {
      method: "POST",
    });

    if (!chargeRes.ok) {
      const data = await chargeRes.json();
      setError(data.error ?? "Failed to process immediate charge.");
      setIsSubmitting(false);
      return;
    }

    router.push("/collector/checkout/complete?mode=immediate");
  };

  return (
    <>
      {/* Confirm step overlay — shown on top when step === "confirm" */}
      {step === "confirm" && exactPrice && (
        <div className="space-y-5">
          <ExactPriceBlock exact={exactPrice} cycleLockDate={cycleLockDate} />

          {error && (
            <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 flex items-start gap-2 text-sm text-destructive-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary CTA: Order Now */}
            <button
              type="button"
              onClick={handleOrderNow}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing…
                </span>
              ) : (
                <>
                  Order Now — Pay{" "}
                  {formatCurrency(exactPrice.amount, exactPrice.currency)} today
                </>
              )}
            </button>

            {/* Secondary CTA: Save for later */}
            <button
              type="button"
              onClick={() => handleConfirm()}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground/70 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                <>Save & pay {lockDate ? `at ${lockDate}` : "at cycle lock"}</>
              )}
            </button>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setExactPrice(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-muted-foreground/50 hover:text-muted-foreground/70 disabled:opacity-50 transition-colors"
            >
              Edit address / card
            </button>
          </div>

          {/* Explanation cards */}
          <div className="space-y-3">
            <div className="rounded-lg border border-info-border bg-info-bg p-4 text-sm">
              <p className="font-medium text-info-foreground mb-1">
                Order Now — your booklet prints today
              </p>
              <p className="text-info-foreground">
                Your card will be charged{" "}
                {formatCurrency(exactPrice.amount, exactPrice.currency)}{" "}
                immediately. Your booklet will be printed and shipped right
                away. Your selections are now locked.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground/70">
              <p className="flex items-center gap-2 font-medium text-muted-foreground/80 mb-1">
                <Lock className="h-3.5 w-3.5" />
                Save & pay later
              </p>
              <p>
                Your selections can still change until lock date. You&apos;ll be
                charged the final recalculated amount{" "}
                {lockDate ? `at ${lockDate}` : "at cycle lock"}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form is always rendered so Stripe elements stay mounted; hidden during confirm step */}
      <form
        onSubmit={handleCalculate}
        className={step === "confirm" ? "hidden" : "space-y-5"}
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
            Delivery Address
          </h2>
          <AddressElement
            options={{
              mode: "shipping",
              allowedCountries:
                allowedCountries.length > 0 ? allowedCountries : undefined,
              defaultValues: defaultAddress
                ? {
                    name: defaultAddress.name ?? "",
                    address: {
                      line1: defaultAddress.line1 ?? "",
                      city: defaultAddress.city ?? "",
                      state: defaultAddress.state ?? "",
                      postal_code: defaultAddress.postal_code ?? "",
                      country: defaultAddress.country ?? "",
                    },
                  }
                : undefined,
            }}
            onChange={async (event) => {
              const addr = event.value?.address;
              if (!addr?.country) return;

              const currentCountry = liveEstimate
                ? undefined
                : defaultAddress?.country;

              // Only refetch if country changed from initial or previous
              if (addr.country === currentCountry) return;

              onRefreshingChange(true);
              setError(null);

              const result = await fetchLiveQuote(
                addr.country,
                addr.state || undefined,
              );

              if ("error" in result && result.error) {
                setError(result.error);
              } else if ("quote" in result && result.quote) {
                onEstimateChange({
                  baseAmount: result.quote.baseAmount,
                  shippingAmount: result.quote.shippingAmount,
                  markupAmount: result.quote.markupAmount,
                  taxAmount: result.quote.taxAmount,
                  totalEstimate: result.quote.totalEstimate,
                  currency: result.quote.currency,
                });
              }

              onRefreshingChange(false);
            }}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
            Payment Method
          </h2>
          <PaymentElement options={{ layout: "tabs" }} />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 flex items-start gap-2 text-sm text-destructive-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isCalculating || !stripe || !elements}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Calculating price estimate…
            </span>
          ) : (
            "Calculate price estimate & review"
          )}
        </button>

        <p className="text-xs text-muted-foreground/50 text-center">
          No charge today. We calculate a price estimate from your address, then
          you confirm before we save your card.
        </p>
      </form>
    </>
  );
}

export function CheckoutPaymentForm(props: CheckoutPaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveEstimate, setLiveEstimate] = useState<EstimateSummary | null>(
    props.estimateSummary,
  );
  const [isRefreshingEstimate, setIsRefreshingEstimate] = useState(false);

  useEffect(() => {
    fetch("/api/collector/setup-intent", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to initialize payment setup.");
        return res.json();
      })
      .then((data) => setClientSecret(data.clientSecret))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Setup failed."),
      );
  }, []);

  const stripeColorPrimary = useMemo(() => {
    if (typeof window === "undefined") return "#a21caf";
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() || "#a21caf"
    );
  }, []);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: stripeColorPrimary,
                fontFamily: "inherit",
                borderRadius: "6px",
              },
            },
          }
        : null,
    [clientSecret, stripeColorPrimary],
  );

  return (
    <div className="space-y-5">
      {(props.estimateSummary || liveEstimate) && (
        <EstimateBlock
          estimate={liveEstimate ?? props.estimateSummary!}
          cycleLockDate={props.cycleLockDate}
          isRefreshing={isRefreshingEstimate}
        />
      )}

      {loadError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 text-sm text-destructive-foreground">
          {loadError}
        </div>
      )}

      {!clientSecret && !loadError && (
        <div className="rounded-lg border border-border bg-card p-5 animate-pulse h-48" />
      )}

      {clientSecret && options && (
        <Elements key={clientSecret} stripe={stripePromise} options={options}>
          <CheckoutFormInner
            {...props}
            liveEstimate={liveEstimate}
            isRefreshingEstimate={isRefreshingEstimate}
            onEstimateChange={setLiveEstimate}
            onRefreshingChange={setIsRefreshingEstimate}
          />
        </Elements>
      )}
    </div>
  );
}
