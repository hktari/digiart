export const COLLECTOR_CART_UPDATED_EVENT = "collector-cart-updated";

export function dispatchCollectorCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COLLECTOR_CART_UPDATED_EVENT));
}
