export const DISCOVER_BOOKLET_UPDATED_EVENT = "discover-booklet-updated";

export function dispatchDiscoverBookletUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DISCOVER_BOOKLET_UPDATED_EVENT));
}
