"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PriceSummary {
  baseAmount: number;
  shippingAmount: number;
  markupAmount: number;
  taxAmount: number;
  totalEstimate: number;
  currency: string;
}

interface CheckoutFormInnerProps {
  cycleLockDate: string | null;
  priceSummary: PriceSummary | null;
  alreadyHasPaymentMethod: boolean;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

function PriceSummaryBlock({
  quote,
  cycleLockDate,
}: {
  quote: PriceSummary;
  cycleLockDate: string | null;
}) {
  const lockDateFormatted = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-beige-200 bg-white p-5 space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50 mb-3">
        Price Estimate
      </h2>
      <div className="flex justify-between text-sm text-ink/70">
        <span>Production</span>
        <span>{formatCurrency(quote.baseAmount, quote.currency)}</span>
      </div>
      {quote.shippingAmount > 0 && (
        <div className="flex justify-between text-sm text-ink/70">
          <span>Shipping</span>
          <span>{formatCurrency(quote.shippingAmount, quote.currency)}</span>
        </div>
      )}
      {quote.markupAmount > 0 && (
        <div className="flex justify-between text-sm text-ink/70">
          <span>Platform fee</span>
          <span>{formatCurrency(quote.markupAmount, quote.currency)}</span>
        </div>
      )}
      {quote.taxAmount > 0 && (
        <div className="flex justify-between text-sm text-ink/70">
          <span>Tax</span>
          <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-semibold text-ink pt-2 border-t border-beige-200">
        <span>Estimated total</span>
        <span>{formatCurrency(quote.totalEstimate, quote.currency)}</span>
      </div>
      <p className="text-xs text-ink/50 pt-1">
        This is an estimate. The final amount is calculated at cycle lock
        {lockDateFormatted ? ` on ${lockDateFormatted}` : ""} based on your
        final selections and delivery address.{" "}
        <strong>Your card will not be charged until then.</strong>
      </p>
    </div>
  );
}

function CardFormInner({
  cycleLockDate,
  priceSummary,
}: {
  cycleLockDate: string | null;
  priceSummary: PriceSummary | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const lockDateFormatted = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your card details.");
      setIsSubmitting(false);
      return;
    }

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
        setError(data.error ?? "Failed to finalize your booklet commitment.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      router.push("/collector/checkout/complete");
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-jade-200 bg-jade-50 p-6 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-jade-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-jade-800">Booklet committed!</p>
          <p className="text-sm text-jade-700 mt-1">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg border border-beige-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink/50 mb-4">
          Payment Method
        </h2>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-lg border border-beige-100 bg-beige-50 p-4 text-sm text-ink/70 space-y-1">
        <p className="flex items-center gap-2 font-medium text-ink/80">
          <Lock className="h-3.5 w-3.5" />
          No charge today
        </p>
        <p>
          Your card will be saved securely. You will only be charged
          {lockDateFormatted ? ` on ${lockDateFormatted}` : " at cycle lock"},
          after your final selections are confirmed. You can still modify your
          booklet until then.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting
          ? "Saving…"
          : `Save card & commit booklet${lockDateFormatted ? ` — charged on ${lockDateFormatted}` : ""}`}
      </button>
    </form>
  );
}

export function CheckoutPaymentForm({
  cycleLockDate,
  priceSummary,
  alreadyHasPaymentMethod,
}: CheckoutFormInnerProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const _router = useRouter();

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

  if (alreadyHasPaymentMethod) {
    return (
      <AlreadyHasCardForm
        cycleLockDate={cycleLockDate}
        priceSummary={priceSummary}
      />
    );
  }

  return (
    <div className="space-y-5">
      {priceSummary && (
        <PriceSummaryBlock quote={priceSummary} cycleLockDate={cycleLockDate} />
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!clientSecret && !loadError && (
        <div className="rounded-lg border border-beige-200 bg-white p-5 animate-pulse h-40" />
      )}

      {clientSecret && options && (
        <Elements stripe={stripePromise} options={options}>
          <CardFormInner
            cycleLockDate={cycleLockDate}
            priceSummary={priceSummary}
          />
        </Elements>
      )}
    </div>
  );
}

function AlreadyHasCardForm({
  cycleLockDate,
  priceSummary,
}: {
  cycleLockDate: string | null;
  priceSummary: PriceSummary | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockDateFormatted = cycleLockDate
    ? new Date(cycleLockDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const handleCommit = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await fetch("/collector/api/commit", { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to commit.");
      setIsSubmitting(false);
      return;
    }
    router.push("/collector/checkout/complete");
  };

  return (
    <div className="space-y-5">
      {priceSummary && (
        <PriceSummaryBlock quote={priceSummary} cycleLockDate={cycleLockDate} />
      )}

      <div className="rounded-lg border border-beige-100 bg-beige-50 p-4 text-sm text-ink/70 space-y-1">
        <p className="flex items-center gap-2 font-medium text-ink/80">
          <Lock className="h-3.5 w-3.5" />
          Card already saved
        </p>
        <p>
          You have a saved payment method. It will be charged
          {lockDateFormatted ? ` on ${lockDateFormatted}` : " at cycle lock"}.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleCommit}
        className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting
          ? "Committing…"
          : `Commit booklet${lockDateFormatted ? ` — charged on ${lockDateFormatted}` : ""}`}
      </button>
    </div>
  );
}
