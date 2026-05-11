"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { mutate } from "swr";
import { CART_SUMMARY_KEY } from "@/components/collector-booklet-cart";
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
};

export type UseBookletToggleReturn = {
  isSelected: boolean;
  isPending: boolean;
  isHydrated: boolean;
  toggle: () => void;
};

export function useBookletToggle(
  releaseId: string,
  releaseData: ReleaseData | null,
  options: UseBookletToggleOptions,
): UseBookletToggleReturn {
  const { isAuthenticated, hasCollectorRole, cycleId } = options;
  const canUseServer = isAuthenticated && hasCollectorRole && cycleId !== null;

  const [isPending, startTransition] = useTransition();
  const [localSelected, setLocalSelected] = useState<boolean | null>(null);
  const [serverSelected, setServerSelected] = useState<boolean | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hydrate local selection from localStorage
    const items = getStoredBooklet();
    setLocalSelected(items.some((i) => i.releaseId === releaseId));
    setIsHydrated(true);
  }, [releaseId]);

  const isSelected = useMemo(() => {
    if (canUseServer) {
      return serverSelected ?? localSelected ?? false;
    }
    return localSelected ?? false;
  }, [canUseServer, serverSelected, localSelected]);

  const toggle = useCallback(() => {
    if (canUseServer && cycleId) {
      const nextSelected = !isSelected;
      setServerSelected(nextSelected);
      startTransition(async () => {
        try {
          const result = await toggleReleaseSelection(releaseId, cycleId);
          if (!result.success) {
            // Revert on failure
            setServerSelected((prev) => !prev);
            return;
          }
          mutate(CART_SUMMARY_KEY);
        } catch {
          // Revert on error
          setServerSelected((prev) => !prev);
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
