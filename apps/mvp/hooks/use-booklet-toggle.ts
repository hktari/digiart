"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import useSWR, { mutate } from "swr";
import { CART_SUMMARY_KEY } from "@/components/collector-booklet-cart";
import type { CollectorCartSummary } from "@/lib/actions/collector";
import { toggleReleaseSelection } from "@/lib/actions/collector";
import { dispatchDiscoverBookletUpdated } from "@/lib/discover-booklet-events";

export const DISCOVER_BOOKLET_STORAGE_KEY = "discover-booklet";

export type BookletItem = {
  releaseId: string;
  title: string;
  creatorDisplayName: string;
  creatorSlug: string;
  artworkCount: number;
};

export type ReleaseData = {
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

export function getStoredBooklet(): BookletItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISCOVER_BOOKLET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredBooklet(items: BookletItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISCOVER_BOOKLET_STORAGE_KEY, JSON.stringify(items));
}

function addToLocalBooklet(releaseData: ReleaseData): void {
  const items = getStoredBooklet();
  const existing = items.find((i) => i.releaseId === releaseData.id);
  if (existing) return;
  const newItem: BookletItem = {
    releaseId: releaseData.id,
    title: releaseData.title,
    creatorDisplayName: releaseData.creatorProfile.displayName,
    creatorSlug: releaseData.creatorProfile.slug,
    artworkCount: releaseData._count.artworks,
  };
  setStoredBooklet([...items, newItem]);
}

function removeFromLocalBooklet(releaseId: string): void {
  const items = getStoredBooklet();
  setStoredBooklet(items.filter((i) => i.releaseId !== releaseId));
}

export type UseBookletToggleOptions = {
  isAuthenticated: boolean;
  hasCollectorRole: boolean;
  cycleId: string | null;
  initiallySelected?: boolean;
};

export type UseBookletToggleReturn = {
  isSelected: boolean;
  isPending: boolean;
  isHydrated: boolean;
  toggle: () => void;
};

interface CartData extends CollectorCartSummary {
  quote: unknown | null;
  checkoutIntent: unknown | null;
  cycleLockDate: string | null;
}

const cartFetcher = async (url: string): Promise<CartData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load cart summary");
  return res.json();
};

export function useBookletToggle(
  releaseId: string,
  releaseData: ReleaseData | null,
  options: UseBookletToggleOptions,
): UseBookletToggleReturn {
  const { isAuthenticated, hasCollectorRole, cycleId, initiallySelected } =
    options;
  const canUseServer = isAuthenticated && hasCollectorRole && cycleId !== null;

  const [isPending, startTransition] = useTransition();
  const [localSelected, setLocalSelected] = useState<boolean | null>(null);
  // Optimistic override: null means "use SWR/initiallySelected as source of truth"
  const [optimisticOverride, setOptimisticOverride] = useState<boolean | null>(
    null,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Subscribe to the live cart state so sidebar removals and other page toggles
  // are reflected here without a page reload.
  const { data: cartData } = useSWR<CartData>(
    canUseServer ? CART_SUMMARY_KEY : null,
    cartFetcher,
    { revalidateOnFocus: true },
  );

  useEffect(() => {
    // Hydrate local selection from localStorage (used by anon / non-collector paths)
    const items = getStoredBooklet();
    setLocalSelected(items.some((i) => i.releaseId === releaseId));
    setIsHydrated(true);
  }, [releaseId]);

  const isSelected = useMemo(() => {
    if (canUseServer) {
      // If we have an in-flight optimistic update, use that
      if (optimisticOverride !== null) return optimisticOverride;
      // If SWR has loaded, derive from the live cart
      if (cartData) {
        return cartData.selectedReleases.some((r) => r.releaseId === releaseId);
      }
      // Fall back to SSR-computed value while SWR is loading
      return initiallySelected ?? false;
    }
    return localSelected ?? false;
  }, [
    canUseServer,
    optimisticOverride,
    cartData,
    releaseId,
    initiallySelected,
    localSelected,
  ]);

  const toggle = useCallback(() => {
    if (canUseServer && cycleId) {
      const nextSelected = !isSelected;
      setOptimisticOverride(nextSelected);
      startTransition(async () => {
        try {
          const result = await toggleReleaseSelection(releaseId, cycleId);
          if (!result.success) {
            // Revert on failure
            setOptimisticOverride((prev) => (prev === null ? null : !prev));
            return;
          }
          // Clear optimistic override and let SWR give us the truth
          setOptimisticOverride(null);
          mutate(CART_SUMMARY_KEY);
        } catch {
          // Revert on error
          setOptimisticOverride((prev) => (prev === null ? null : !prev));
        }
      });
      return;
    }

    // LocalStorage fallback (anon or auth without collector/cycle)
    if (!releaseData) return;

    const currentlySelected = getStoredBooklet().some(
      (i) => i.releaseId === releaseId,
    );
    if (currentlySelected) {
      removeFromLocalBooklet(releaseId);
    } else {
      addToLocalBooklet(releaseData);
    }
    setLocalSelected(!currentlySelected);
    dispatchDiscoverBookletUpdated();
  }, [canUseServer, cycleId, isSelected, releaseId, releaseData]);

  return {
    isSelected,
    isPending,
    isHydrated,
    toggle,
  };
}
