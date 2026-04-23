// Umami Analytics Tracking Utility

declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        props?: Record<string, string | number>,
      ) => void;
    };
  }
}

// Event names for consistency
export const ANALYTICS_EVENTS = {
  SCROLL_DEPTH: "scroll_depth",
  CTA_CLICK: "cta_click",
  CTA_VIEWED: "cta_viewed",
  WAITLIST_SIGNUP: "waitlist_signup",
  QUESTIONNAIRE_OPEN: "questionnaire_open",
} as const;

// Track a custom event with Umami
export function trackEvent(
  eventName: string,
  props?: Record<string, string | number>,
): void {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(eventName, props);
  }
}

// Track scroll depth milestone
export function trackScrollDepth(percent: 25 | 50 | 75 | 100): void {
  trackEvent(ANALYTICS_EVENTS.SCROLL_DEPTH, { percent });
}

// Track CTA click from landing page
export function trackCtaClick(destination: "creators" | "collectors"): void {
  trackEvent(ANALYTICS_EVENTS.CTA_CLICK, { destination });
}

// Track CTA section viewed
export function trackCtaViewed(): void {
  trackEvent(ANALYTICS_EVENTS.CTA_VIEWED);
}

// Track waitlist signup
export function trackWaitlistSignup(audience: "creator" | "collector"): void {
  trackEvent(ANALYTICS_EVENTS.WAITLIST_SIGNUP, { audience });
}

// Track questionnaire open
export function trackQuestionnaireOpen(
  audience: "creator" | "collector",
): void {
  trackEvent(ANALYTICS_EVENTS.QUESTIONNAIRE_OPEN, { audience });
}
