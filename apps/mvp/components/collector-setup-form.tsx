"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { CollectorSetupResult } from "@/lib/actions/collector";
import { saveCollectorProfile } from "@/lib/actions/collector";

interface CollectorSetupFormProps {
  initialData?: {
    displayName?: string;
    shippingCountry?: string;
    shippingStateCode?: string;
  };
  redirectTo?: string;
}

// TODO: Replace with dynamic country list from Peecho API (Sprint 4 / T18)
// This hardcoded list is temporary - should fetch from PodOffering or Peecho API
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "NZ", name: "New Zealand" },
];

export function CollectorSetupForm({
  initialData,
  redirectTo = "/",
}: CollectorSetupFormProps) {
  const router = useRouter();
  const [shippingCountry, setShippingCountry] = useState(
    initialData?.shippingCountry || "",
  );
  const [state, formAction, isPending] = useActionState<
    CollectorSetupResult,
    FormData
  >(saveCollectorProfile, { success: false, errors: {} });

  useEffect(() => {
    if (state.success) {
      router.push(redirectTo);
    }
  }, [state.success, router, redirectTo]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-neutral-600">
            We need a few details to get you started
          </p>
        </div>

        <form action={formAction} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-neutral-700"
            >
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              defaultValue={initialData?.displayName}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              placeholder="How should we call you?"
            />
            {!state.success && state.errors.displayName && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.displayName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="shippingCountry"
              className="block text-sm font-medium text-neutral-700"
            >
              Shipping Country
            </label>
            <select
              id="shippingCountry"
              name="shippingCountry"
              defaultValue={initialData?.shippingCountry}
              required
              onChange={(event) => setShippingCountry(event.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {!state.success && state.errors.shippingCountry && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.shippingCountry}
              </p>
            )}
          </div>

          {shippingCountry === "US" && (
            <div>
              <label
                htmlFor="shippingStateCode"
                className="block text-sm font-medium text-neutral-700"
              >
                State Code (US only)
              </label>
              <input
                type="text"
                id="shippingStateCode"
                name="shippingStateCode"
                defaultValue={initialData?.shippingStateCode}
                required
                maxLength={2}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 uppercase shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                placeholder="CA"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Use 2-letter USPS code, e.g. CA, NY, TX.
              </p>
              {!state.success && state.errors.shippingStateCode && (
                <p className="mt-1 text-sm text-red-600">
                  {state.errors.shippingStateCode}
                </p>
              )}
            </div>
          )}

          {!state.success && state.errors._form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{state.errors._form}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
