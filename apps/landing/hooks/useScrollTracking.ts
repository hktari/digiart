"use client";

import { useEffect, useRef } from "react";
import { trackScrollDepth } from "@/lib/analytics";

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

export function useScrollTracking(enabled = true) {
  const trackedMilestones = useRef<Set<Milestone>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      MILESTONES.forEach((milestone) => {
        if (scrollPercent >= milestone && !trackedMilestones.current.has(milestone)) {
          trackedMilestones.current.add(milestone);
          trackScrollDepth(milestone);
        }
      });
    };

    // Debounce scroll handler
    let timeoutId: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener("scroll", debouncedHandler, { passive: true });

    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener("scroll", debouncedHandler);
      clearTimeout(timeoutId);
    };
  }, [enabled]);
}
