"use client";

import Link from "next/link";
import { useBookletToggle } from "@/hooks/use-booklet-toggle";

type Props = {
  releaseId: string;
  releaseData: {
    id: string;
    title: string;
    creatorProfile: {
      displayName: string;
      slug: string;
    };
    _count: {
      artworks: number;
    };
  };
  cycleId: string | null;
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  hasCollectorProfile: boolean;
  initiallySelected: boolean;
};

export function PublicReleaseBookletCta({
  releaseId,
  releaseData,
  cycleId,
  isAuthenticated,
  hasCollectorRole,
  hasCollectorProfile,
  initiallySelected,
}: Props) {
  const { isSelected, isPending, isHydrated, toggle } = useBookletToggle(
    releaseId,
    releaseData,
    {
      isAuthenticated,
      hasCollectorRole,
      cycleId,
    },
  );

  const effectiveSelected = isHydrated ? isSelected : initiallySelected;

  if (!isAuthenticated) {
    return (
      <div className="lg:sticky lg:bottom-4 z-20 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Sign in to build your booklet
            </p>
            <p className="text-sm text-neutral-600">
              Save this release into your next booklet once you have an account.
            </p>
          </div>
          <Link
            href="/auth/sign-in?redirect=/browse"
            className="inline-flex justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!hasCollectorRole || !hasCollectorProfile) {
    return (
      <div className="lg:sticky lg:bottom-4 z-20 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Turn on booklet building
            </p>
            <p className="text-sm text-neutral-600">
              Complete booklet setup to add releases to your next printed
              booklet.
            </p>
          </div>
          <Link
            href="/collector/setup"
            className="inline-flex justify-center rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
          >
            Complete setup
          </Link>
        </div>
      </div>
    );
  }

  if (!cycleId) {
    return (
      <div className="lg:sticky lg:bottom-4 z-20 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm font-semibold text-neutral-900">
          No active cycle
        </p>
        <p className="text-sm text-neutral-600">
          Release selection will reopen when the next booklet cycle starts.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:bottom-4 z-20 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {effectiveSelected
              ? "This release is in your booklet"
              : "Add this release to your booklet"}
          </p>
          <p className="text-sm text-neutral-600">
            {effectiveSelected
              ? "You can remove it or keep browsing artworks in this release."
              : "Use complete releases as building blocks instead of selecting artworks one by one."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending || !isHydrated}
          className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
            effectiveSelected
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
          }`}
        >
          {isPending
            ? "Saving..."
            : effectiveSelected
              ? "Remove from booklet"
              : "Add to booklet"}
        </button>
      </div>
    </div>
  );
}
