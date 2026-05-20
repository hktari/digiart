import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncPeechoOfferings } from "../peecho/offering-sync";

vi.mock("@/lib/db", () => ({
  db: {
    podProviderConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    podOffering: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    fulfillmentCountry: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    fulfillmentState: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../peecho/client", () => ({
  peechoClient: {
    getOfferings: vi.fn(),
    getCountries: vi.fn(),
    getUSStateCodes: vi.fn(),
  },
}));

describe("syncPeechoOfferings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates provider config if none exists and syncs offerings", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    const newProvider = {
      id: "provider-1",
      provider: "Peecho",
      environment: "SANDBOX",
      isActive: true,
    };
    const mockOfferings = [
      {
        id: "1",
        name: "Booklet A4",
        minNumberOfPages: 20,
        maxNumberOfPages: 100,
        dimensionWidth: 210,
        dimensionHeight: 297,
        pricingDto: null,
      },
    ];

    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue(null);
    vi.mocked(db.podProviderConfig.create).mockResolvedValue(
      newProvider as never,
    );
    vi.mocked(peechoClient.getOfferings).mockResolvedValue(
      mockOfferings as never,
    );
    vi.mocked(db.podOffering.upsert).mockResolvedValue({} as never);
    vi.mocked(db.podOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(peechoClient.getCountries).mockResolvedValue([]);
    vi.mocked(peechoClient.getUSStateCodes).mockResolvedValue([]);
    vi.mocked(db.fulfillmentCountry.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentCountry.updateMany).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.updateMany).mockResolvedValue({} as never);

    const result = await syncPeechoOfferings();

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);
    expect(db.podProviderConfig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ provider: "Peecho" }),
    });
    expect(db.podOffering.upsert).toHaveBeenCalledTimes(1);
  });

  it("reuses existing provider config", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    const existingProvider = {
      id: "provider-1",
      provider: "Peecho",
      environment: "SANDBOX",
      isActive: true,
    };
    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue(
      existingProvider as never,
    );
    vi.mocked(peechoClient.getOfferings).mockResolvedValue([]);
    vi.mocked(db.podOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(peechoClient.getCountries).mockResolvedValue([]);
    vi.mocked(peechoClient.getUSStateCodes).mockResolvedValue([]);
    vi.mocked(db.fulfillmentCountry.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentCountry.updateMany).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.updateMany).mockResolvedValue({} as never);

    await syncPeechoOfferings();

    expect(db.podProviderConfig.create).not.toHaveBeenCalled();
  });

  it("syncs multiple offerings", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    const provider = {
      id: "provider-1",
      provider: "Peecho",
      environment: "SANDBOX",
      isActive: true,
    };
    const mockOfferings = [
      {
        id: "1",
        name: "Booklet A5",
        minNumberOfPages: 20,
        maxNumberOfPages: 60,
        dimensionWidth: 148,
        dimensionHeight: 210,
      },
      {
        id: "2",
        name: "Booklet A4",
        minNumberOfPages: 20,
        maxNumberOfPages: 100,
        dimensionWidth: 210,
        dimensionHeight: 297,
      },
      {
        id: "3",
        name: "Booklet A3",
        minNumberOfPages: 20,
        maxNumberOfPages: 150,
        dimensionWidth: 297,
        dimensionHeight: 420,
      },
    ];

    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue(
      provider as never,
    );
    vi.mocked(peechoClient.getOfferings).mockResolvedValue(
      mockOfferings as never,
    );
    vi.mocked(db.podOffering.upsert).mockResolvedValue({} as never);
    vi.mocked(db.podOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(peechoClient.getCountries).mockResolvedValue([]);
    vi.mocked(peechoClient.getUSStateCodes).mockResolvedValue([]);
    vi.mocked(db.fulfillmentCountry.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentCountry.updateMany).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.updateMany).mockResolvedValue({} as never);

    const result = await syncPeechoOfferings();

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);
    expect(db.podOffering.upsert).toHaveBeenCalledTimes(3);
  });

  it("returns success with 0 count when no offerings available", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    const provider = { id: "provider-1" };
    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue(
      provider as never,
    );
    vi.mocked(peechoClient.getOfferings).mockResolvedValue([]);
    vi.mocked(db.podOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(peechoClient.getCountries).mockResolvedValue([]);
    vi.mocked(peechoClient.getUSStateCodes).mockResolvedValue([]);
    vi.mocked(db.fulfillmentCountry.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentCountry.updateMany).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.updateMany).mockResolvedValue({} as never);

    const result = await syncPeechoOfferings();

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(0);
  });

  it("returns error when Peecho client throws", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue({
      id: "p1",
    } as never);
    vi.mocked(peechoClient.getOfferings).mockRejectedValue(
      new Error("Peecho API error: 500"),
    );

    const result = await syncPeechoOfferings();

    expect(result.success).toBe(false);
    expect(result.error).toContain("Peecho API error");
  });

  it("uses PRODUCTION environment when PEECHO_ENV is PRODUCTION", async () => {
    const { db } = await import("@/lib/db");
    const { peechoClient } = await import("../peecho/client");

    process.env.PEECHO_ENV = "PRODUCTION";
    vi.mocked(db.podProviderConfig.findFirst).mockResolvedValue(null);
    vi.mocked(db.podProviderConfig.create).mockResolvedValue({
      id: "p1",
    } as never);
    vi.mocked(peechoClient.getOfferings).mockResolvedValue([]);
    vi.mocked(db.podOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(peechoClient.getCountries).mockResolvedValue([]);
    vi.mocked(peechoClient.getUSStateCodes).mockResolvedValue([]);
    vi.mocked(db.fulfillmentCountry.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentCountry.updateMany).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.upsert).mockResolvedValue({} as never);
    vi.mocked(db.fulfillmentState.updateMany).mockResolvedValue({} as never);

    await syncPeechoOfferings();

    expect(db.podProviderConfig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ environment: "PRODUCTION" }),
    });

    delete process.env.PEECHO_ENV;
  });
});
