"use client";

import { useState, useEffect } from "react";
import type { PodProviderConfig, PodOffering } from "@prisma/client";

type ProviderWithOfferings = PodProviderConfig & {
  offerings: PodOffering[];
};

export default function AdminPodPage() {
  const [provider, setProvider] = useState<ProviderWithOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadProvider = async () => {
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
  };

  useEffect(() => {
    loadProvider();
  }, []);

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
    } catch (error) {
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
        <p className="text-gray-600 mt-1">
          Manage Peecho integration and product offerings
        </p>
      </div>

      {provider ? (
        <>
          <div className="bg-white border rounded-lg p-6">
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
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
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
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {provider.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Product Offerings</h2>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Offerings"}
              </button>
            </div>

            {syncMessage && (
              <div
                className={`mb-4 px-4 py-3 rounded ${
                  syncMessage.startsWith("✓")
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {syncMessage}
              </div>
            )}

            {provider.offerings.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">
                  No offerings synced yet. Click "Sync Offerings" to fetch from
                  Peecho.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        Pages
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        Dimensions
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        Last Synced
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {provider.offerings.map((offering) => (
                      <tr key={offering.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">
                          {offering.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {offering.minPages} - {offering.maxPages}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {offering.widthMm && offering.heightMm
                            ? `${offering.widthMm} × ${offering.heightMm} mm`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {offering.syncedAt
                            ? new Date(offering.syncedAt).toLocaleString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              offering.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {offering.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button
                            onClick={() =>
                              handleToggleOffering(
                                offering.id,
                                offering.isActive,
                              )
                            }
                            className="text-fuchsia-600 hover:underline"
                          >
                            {offering.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No POD provider configured. Sync offerings to initialize.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="mt-4 px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Initialize Peecho"}
          </button>
        </div>
      )}
    </div>
  );
}
