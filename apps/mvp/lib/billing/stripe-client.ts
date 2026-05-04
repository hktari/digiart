import Stripe from "stripe";

let _stripe: Stripe | undefined;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
      }
      _stripe = new Stripe(key, {
        apiVersion: "2026-04-22.dahlia",
        typescript: true,
        maxNetworkRetries: 3,
        timeout: 10000,
      });
    }
    return (_stripe as any)[prop];
  },
});
