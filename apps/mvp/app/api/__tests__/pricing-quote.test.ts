import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../pricing/quote/route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/peecho/quote-service", () => ({
  getQuote: vi.fn(),
}));

describe("POST /api/pricing/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns quote for authenticated user", async () => {
    const { auth } = await import("@/lib/auth");
    const { getQuote } = await import("@/lib/peecho/quote-service");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      expires: "2099-01-01",
    });

    vi.mocked(getQuote).mockResolvedValue({
      shippingAmount: 5.0,
      productAmount: 12.5,
      taxAmount: 1.75,
      totalEstimate: 19.25,
      currency: "USD",
      offeringId: "ext-1",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({
        country: "US",
        countryStateCode: "CA",
        pageCount: 30,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalEstimate).toBe(19.25);
    expect(data.currency).toBe("USD");
    expect(getQuote).toHaveBeenCalledWith({
      country: "US",
      pageCount: 30,
      offeringId: undefined,
      countryStateCode: "CA",
    });
  });

  it("returns 401 for unauthenticated request", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({ country: "US", pageCount: 30 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when country is missing", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({ pageCount: 30 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when pageCount is missing", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({ country: "US" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when country is invalid (not 2-char)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({ country: "USA", pageCount: 30 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("passes offeringId when provided", async () => {
    const { auth } = await import("@/lib/auth");
    const { getQuote } = await import("@/lib/peecho/quote-service");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });
    vi.mocked(getQuote).mockResolvedValue({
      shippingAmount: 5.0,
      productAmount: 12.5,
      taxAmount: 1.75,
      totalEstimate: 19.25,
      currency: "USD",
      offeringId: "specific-offering",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({
        country: "US",
        countryStateCode: "NY",
        pageCount: 30,
        offeringId: "specific-offering",
      }),
    });

    await POST(req);

    expect(getQuote).toHaveBeenCalledWith({
      country: "US",
      pageCount: 30,
      offeringId: "specific-offering",
      countryStateCode: "NY",
    });
  });

  it("returns 400 when US countryStateCode is missing", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({ country: "US", pageCount: 30 }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("countryStateCode is required");
  });

  it("returns 500 when quote service throws", async () => {
    const { auth } = await import("@/lib/auth");
    const { getQuote } = await import("@/lib/peecho/quote-service");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
      expires: "2099-01-01",
    });
    vi.mocked(getQuote).mockRejectedValue(
      new Error("No suitable offering found"),
    );

    const req = new Request("http://localhost/api/pricing/quote", {
      method: "POST",
      body: JSON.stringify({
        country: "US",
        countryStateCode: "CA",
        pageCount: 30,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("No suitable offering found");
  });
});
