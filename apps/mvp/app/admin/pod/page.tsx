"use client";

import type { PodOffering, PodProviderConfig } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

type ProviderWithOfferings = PodProviderConfig & {
  offerings: PodOffering[];
};

type PeechoCountry = { code: string; name: string };

type CountriesState = {
  loading: boolean;
  data: PeechoCountry[] | null;
  error: string | null;
};

function OfferingRow({
  offering,
  onToggle,
}: {
  offering: PodOffering;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [countries, setCountries] = useState<CountriesState>({
    loading: false,
    data: null,
    error: null,
  });

  const loadCountries = useCallback(async () => {
    if (countries.data !== null || countries.loading) return;
    setCountries((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(
        `/api/admin/pod/offerings/${offering.id}/countries`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setCountries({ loading: false, data: json.countries, error: null });
    } catch {
      setCountries({
        loading: false,
        data: null,
        error: "Failed to load countries",
      });
    }
  }, [offering.id, countries.data, countries.loading]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadCountries();
  };

  return (
    <>
      <tr className="hover:bg-muted/50">
        <td className="px-6 py-4 text-sm font-medium">
          <button
            type="button"
            onClick={handleExpand}
            className="flex items-center gap-1 text-left hover:text-primary"
            title="Toggle countries"
          >
            <span
              className={`inline-block transition-transform text-muted-foreground/60 ${expanded ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            {offering.name}
          </button>
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
          {offering.externalId}
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground">
          {offering.minPages} - {offering.maxPages}
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground">
          {offering.widthMm && offering.heightMm
            ? `${offering.widthMm} × ${offering.heightMm} mm`
            : "-"}
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground">
          {offering.syncedAt
            ? new Date(offering.syncedAt).toLocaleString()
            : "Never"}
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              offering.isActive
                ? "bg-success-bg text-success-foreground border border-success-border"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {offering.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-right">
          <button
            type="button"
            onClick={() => onToggle(offering.id, offering.isActive)}
            className="text-primary hover:underline"
          >
            {offering.isActive ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/50 border-t">
          <td colSpan={7} className="px-8 py-4">
            {countries.loading && (
              <p className="text-sm text-muted-foreground">
                Loading countries…
              </p>
            )}
            {countries.error && (
              <p className="text-sm text-destructive">{countries.error}</p>
            )}
            {countries.data && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Supported countries ({countries.data.length})
                </p>
                {countries.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No countries returned by Peecho for this offering.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {countries.data.map((c) => (
                      <span
                        key={c.code}
                        title={c.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-card border text-muted-foreground font-mono"
                      >
                        {c.code}
                        <span className="font-sans text-muted-foreground/60">
                          {c.name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminPodPage() {
  const [provider, setProvider] = useState<ProviderWithOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadProvider = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/pod/provider");
      if (response.ok) {
        const data = await response.json();
        setProvider(data);
      }
    } catch (error) {
      console.error("Failed to load provider:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/admin/pod/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncMessage(`✓ ${data.message}`);
        await loadProvider();
      } else {
        setSyncMessage(`✗ ${data.error}`);
      }
    } catch (_error) {
      setSyncMessage("✗ Failed to sync offerings");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleOffering = async (
    offeringId: string,
    isActive: boolean,
  ) => {
    try {
      await fetch(`/api/admin/pod/offerings/${offeringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      await loadProvider();
    } catch (error) {
      console.error("Failed to toggle offering:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">POD Provider Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Manage Peecho integration and product offerings
        </p>
      </div>

      {provider ? (
        <>
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Provider Details</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Provider:</strong> {provider.provider}
              </p>
              <p>
                <strong>Environment:</strong>{" "}
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    provider.environment === "PRODUCTION"
                      ? "bg-success-bg text-success-foreground border border-success-border"
                      : "bg-warning-bg text-warning-foreground border border-warning-border"
                  }`}
                >
                  {provider.environment}
                </span>
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    provider.isActive
                      ? "bg-success-bg text-success-foreground border border-success-border"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {provider.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Product Offerings</h2>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Offerings"}
              </button>
            </div>

            {syncMessage && (
              <div
                className={`mb-4 px-4 py-3 rounded ${
                  syncMessage.startsWith("✓")
                    ? "bg-success-bg border border-success-border text-success-foreground"
                    : "bg-destructive-bg border border-destructive-border text-destructive-foreground"
                }`}
              >
                {syncMessage}
              </div>
            )}

            {provider.offerings.length === 0 ? (
              <div className="bg-muted border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  No offerings synced yet. Click "Sync Offerings" to fetch from
                  Peecho.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Click an offering name to inspect supported countries (live
                  from Peecho).
                </p>
                <div className="overflow-hidden border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Peecho ID
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Pages
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Dimensions
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Last Synced
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {provider.offerings.map((offering) => (
                        <OfferingRow
                          key={offering.id}
                          offering={offering}
                          onToggle={handleToggleOffering}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="bg-muted border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No POD provider configured. Sync offerings to initialize.
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Initialize Peecho"}
          </button>
        </div>
      )}
    </div>
  );
}
