"use client";

import { useState } from "react";
import type { BookletConstraint } from "@prisma/client";

interface ConstraintFormProps {
  constraint?: BookletConstraint;
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  onCancel?: () => void;
}

export function ConstraintForm({ constraint, onSubmit, onCancel }: ConstraintFormProps) {
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
    } else if (result.success && onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="minPages" className="block text-sm font-medium mb-2">
            Minimum Pages
          </label>
          <input
            type="number"
            id="minPages"
            name="minPages"
            defaultValue={constraint?.minPages ?? 30}
            required
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="maxPages" className="block text-sm font-medium mb-2">
            Maximum Pages
          </label>
          <input
            type="number"
            id="maxPages"
            name="maxPages"
            defaultValue={constraint?.maxPages ?? 50}
            required
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="maxCreators" className="block text-sm font-medium mb-2">
            Max Creators (Optional)
          </label>
          <input
            type="number"
            id="maxCreators"
            name="maxCreators"
            defaultValue={constraint?.maxCreators ?? undefined}
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label htmlFor="maxReleases" className="block text-sm font-medium mb-2">
            Max Releases (Optional)
          </label>
          <input
            type="number"
            id="maxReleases"
            name="maxReleases"
            defaultValue={constraint?.maxReleases ?? undefined}
            min="1"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          value="true"
          defaultChecked={constraint?.isActive ?? true}
          className="mr-2"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Set as active constraint (will deactivate others)
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : constraint ? "Update" : "Create"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
