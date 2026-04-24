"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionCycle, CycleStatus } from "@prisma/client";

interface CycleFormProps {
  cycle?: SubscriptionCycle;
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export function CycleForm({ cycle, onSubmit }: CycleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await onSubmit(formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      router.push("/admin/cycles");
      router.refresh();
    }
  };

  const formatDateForInput = (date: Date) => {
    return new Date(date).toISOString().slice(0, 16);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="label" className="block text-sm font-medium mb-2">
          Label
        </label>
        <input
          type="text"
          id="label"
          name="label"
          defaultValue={cycle?.label}
          required
          className="w-full px-3 py-2 border rounded-md"
          placeholder="e.g., January 2025"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="month" className="block text-sm font-medium mb-2">
            Month
          </label>
          <select
            id="month"
            name="month"
            defaultValue={cycle?.month}
            required
            className="w-full px-3 py-2 border rounded-md"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {new Date(2024, month - 1).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium mb-2">
            Year
          </label>
          <input
            type="number"
            id="year"
            name="year"
            defaultValue={cycle?.year ?? new Date().getFullYear()}
            required
            min="2024"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="selectionOpenDate"
          className="block text-sm font-medium mb-2"
        >
          Selection Open Date
        </label>
        <input
          type="datetime-local"
          id="selectionOpenDate"
          name="selectionOpenDate"
          defaultValue={
            cycle?.selectionOpenDate
              ? formatDateForInput(cycle.selectionOpenDate)
              : undefined
          }
          required
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label htmlFor="lockDate" className="block text-sm font-medium mb-2">
          Lock Date
        </label>
        <input
          type="datetime-local"
          id="lockDate"
          name="lockDate"
          defaultValue={
            cycle?.lockDate ? formatDateForInput(cycle.lockDate) : undefined
          }
          required
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label
          htmlFor="fulfillmentDate"
          className="block text-sm font-medium mb-2"
        >
          Fulfillment Date
        </label>
        <input
          type="datetime-local"
          id="fulfillmentDate"
          name="fulfillmentDate"
          defaultValue={
            cycle?.fulfillmentDate
              ? formatDateForInput(cycle.fulfillmentDate)
              : undefined
          }
          required
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {cycle && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-2">
            Status (Manual Override)
          </label>
          <select
            id="status"
            name="status"
            defaultValue={cycle.status}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="OPEN">Open</option>
            <option value="LOCKED">Locked</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : cycle ? "Update Cycle" : "Create Cycle"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
