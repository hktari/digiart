"use client";

import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

function EstimateBlock({
  estimate,
  cycleLockDate,
}: {
  estimate: EstimateSummary;
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
    <div className="rounded-lg border border-beige-200 bg-white p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50">
          Price Estimate
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          Estimate
        </span>
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
      <div className="flex justify-between text-base font-semibold text-foregroundpt-2 border-t border-beige-200">
        <span>Estimated total</span>
        <span>{formatCurrency(estimate.totalEstimate, estimate.currency)}</span>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-1">
        This estimate includes our platform margin, calculated from
        Peecho&apos;s wholesale quote. The final Peecho order price may differ
        slightly; we email the final amount before charging.
        {lockDate && (
          <>
            {" "}
            Your card will not be charged until <strong>{lockDate}</strong>.
          </>
        )}
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
    <div className="rounded-lg border border-jade-300 bg-jade-50 p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-jade-700">
          Price Estimate
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-wider text-jade-700 bg-jade-100 border border-jade-300 rounded px-1.5 py-0.5">
          Estimate
        </span>
      </div>
      <div className="flex justify-between text-2xl font-bold text-jade-800">
        <span>{formatCurrency(exact.amount, exact.currency)}</span>
      </div>
      <p className="text-xs text-jade-700">
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
}: CheckoutPaymentFormProps) {
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
  const handleConfirm = async () => {
    if (!stripe || !elements) return;

    setError(null);
    setIsSubmitting(true);

    const setupRes = await fetch("/api/collector/setup-intent", {
      method: "POST",
    });
    if (!setupRes.ok) {
      const data = await setupRes.json();
      setError(data.error ?? "Failed to initialize payment setup.");
      setIsSubmitting(false);
      return;
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
      return;
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
        return;
      }

      router.push("/collector/checkout/complete");
    }
  };

  if (step === "confirm" && exactPrice) {
    return (
      <div className="space-y-5">
        <ExactPriceBlock exact={exactPrice} cycleLockDate={cycleLockDate} />

        <div className="rounded-lg border border-beige-100 bg-beige-50 p-4 text-sm text-muted-foreground/70">
          <p className="flex items-center gap-2 font-medium text-muted-foreground/80 mb-1">
            <Lock className="h-3.5 w-3.5" />
            No charge today
          </p>
          <p>
            Your card will be saved securely. You will only be charged{" "}
            {lockDate ? `on ${lockDate}` : "at cycle lock"}, after your final
            selections are confirmed. You can still modify your booklet until
            then.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setStep("form");
              setExactPrice(null);
            }}
            className="flex-1 rounded-lg border border-beige-200 px-4 py-3 text-sm font-medium text-muted-foreground/70 hover:bg-beige-50 transition-colors"
          >
            Edit address / card
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-2 rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              <>Confirm & save card{lockDate ? ` — charged ${lockDate}` : ""}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCalculate} className="space-y-5">
      <div className="rounded-lg border border-beige-200 bg-white p-5">
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
        />
      </div>

      <div className="rounded-lg border border-beige-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
          Payment Method
        </h2>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isCalculating || !stripe || !elements}
        className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  );
}

export function CheckoutPaymentForm(props: CheckoutPaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: "#a21caf",
                fontFamily: "inherit",
                borderRadius: "6px",
              },
            },
          }
        : null,
    [clientSecret],
  );

  return (
    <div className="space-y-5">
      {props.estimateSummary && (
        <EstimateBlock
          estimate={props.estimateSummary}
          cycleLockDate={props.cycleLockDate}
        />
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!clientSecret && !loadError && (
        <div className="rounded-lg border border-beige-200 bg-white p-5 animate-pulse h-48" />
      )}

      {clientSecret && options && (
        <Elements key={clientSecret} stripe={stripePromise} options={options}>
          <CheckoutFormInner {...props} />
        </Elements>
      )}
    </div>
  );
}
