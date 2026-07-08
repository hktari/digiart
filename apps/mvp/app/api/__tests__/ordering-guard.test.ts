import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the heavy imports of the checkout routes so importing the modules is
// side-effect free. The ordering guard runs BEFORE auth(), so none of these are
// actually invoked in the disabled case — they only need to exist.
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/actions/collector", () => ({ commitBookletForCycle: vi.fn() }));
vi.mock("@/lib/billing/freeze-service", () => ({
  freezeSingleCollectorCycle: vi.fn(),
}));
vi.mock("@/lib/billing/pdf-trigger-service", () => ({
  triggerPdfGenerationForCycle: vi.fn(),
}));
vi.mock("@/lib/billing/stripe-client", () => ({ stripe: {} }));
vi.mock("@/lib/db", () => ({ db: {} }));

const KEY = "NEXT_PUBLIC_ORDERING_ENABLED";

describe("ordering guard on collector checkout routes", () => {
  const original = process.env[KEY];

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it("charge-now returns 403 ordering_paused when ordering is disabled", async () => {
    process.env[KEY] = "false";
    const { POST } = await import("@/app/api/collector/charge-now/route");
    const res = await POST();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "ordering_paused" });
  });

  it("charge-now passes the guard (reaches auth → 401) when enabled", async () => {
    process.env[KEY] = "true";
    const { POST } = await import("@/app/api/collector/charge-now/route");
    const res = await POST();
    // Guard passed through; auth() (mocked null) yields the 401.
    expect(res.status).toBe(401);
  });

  it("setup-intent (withErrorHandler style) returns 403 when disabled", async () => {
    process.env[KEY] = "false";
    const { POST } = await import("@/app/api/collector/setup-intent/route");
    const res = await POST(
      new Request("http://localhost/api/collector/setup-intent", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(403);
    // withErrorHandler maps Errors.FORBIDDEN("ordering_paused") to a structured
    // body: { error: "FORBIDDEN", message: "ordering_paused", ... }.
    expect((await res.json()).message).toBe("ordering_paused");
  });
});
