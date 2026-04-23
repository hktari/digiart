"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { SocialLink } from "@/lib/actions/social-links";
import { saveSocialLinks } from "@/lib/actions/social-links";

interface SocialLinksFormProps {
  initialLinks?: SocialLink[];
}

interface LinkWithError extends SocialLink {
  errors?: { label?: string; url?: string };
}

const MAX_LINKS = 10;
const PREDEFINED_LABELS = [
  "Website",
  "Instagram",
  "Twitter",
  "X",
  "TikTok",
  "YouTube",
  "Behance",
  "Dribbble",
  "ArtStation",
  "DeviantArt",
  "Etsy",
  "Shop",
  "Newsletter",
  "Other",
];

export function SocialLinksForm({ initialLinks = [] }: SocialLinksFormProps) {
  const [links, setLinks] = useState<LinkWithError[]>(initialLinks);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const addLink = useCallback(() => {
    if (links.length >= MAX_LINKS) return;
    setLinks((prev) => [...prev, { label: "", url: "" }]);
    setSaveSuccess(false);
  }, [links.length]);

  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    setSaveSuccess(false);
  }, []);

  const updateLink = useCallback(
    (index: number, field: keyof SocialLink, value: string) => {
      setLinks((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          [field]: value,
          errors: undefined,
        };
        return next;
      });
      setSaveSuccess(false);
    },
    [],
  );

  const validateLinks = useCallback(():
    | { valid: false; errors: LinkWithError[] }
    | { valid: true } => {
    let hasError = false;
    const newLinks = links.map((link) => {
      const errors: { label?: string; url?: string } = {};

      if (!link.label.trim()) {
        errors.label = "Label is required";
        hasError = true;
      }

      if (!link.url.trim()) {
        errors.url = "URL is required";
        hasError = true;
      } else {
        try {
          new URL(link.url);
        } catch {
          errors.url = "Must be a valid URL (include https://)";
          hasError = true;
        }
      }

      return { ...link, errors };
    });

    if (hasError) {
      setLinks(newLinks);
      return { valid: false, errors: newLinks };
    }
    return { valid: true };
  }, [links]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaveError(null);
      setSaveSuccess(false);

      const validation = validateLinks();
      if (!validation.valid) {
        return;
      }

      setIsSaving(true);

      try {
        const result = await saveSocialLinks(
          links.map(({ id, ...rest }) => rest),
        );

        if (result.success) {
          setSaveSuccess(true);
        } else {
          // Apply server errors to links
          setLinks((prev) => {
            const next = [...prev];
            for (const error of result.errors) {
              if (next[error.index]) {
                next[error.index] = {
                  ...next[error.index],
                  errors: {
                    ...next[error.index].errors,
                    [error.field]: error.message,
                  },
                };
              }
            }
            return next;
          });
          setSaveError("Please fix the errors below");
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save social links",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [links, validateLinks],
  );

  const canAddMore = links.length < MAX_LINKS;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Social Links
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Add links to your social media, portfolio, or shop. These will be
          displayed on your public profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {saveSuccess && (
          <div className="rounded-lg border border-jade-200 bg-jade-50 px-4 py-3 text-sm text-jade-700">
            Your social links have been saved.
          </div>
        )}

        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="space-y-4">
          {links.map((link, index) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-200 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <div>
                    <label
                      htmlFor={`label-${index}`}
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Label
                    </label>
                    <select
                      id={`label-${index}`}
                      value={link.label}
                      onChange={(e) =>
                        updateLink(index, "label", e.target.value)
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                        link.errors?.label
                          ? "border-red-300 focus:border-red-500"
                          : "border-neutral-300"
                      }`}
                    >
                      <option value="">Select a label...</option>
                      {PREDEFINED_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {link.errors?.label && (
                      <p className="mt-1 text-sm text-red-600">
                        {link.errors.label}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor={`url-${index}`}
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      URL
                    </label>
                    <input
                      type="url"
                      id={`url-${index}`}
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                      placeholder="https://..."
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                        link.errors?.url
                          ? "border-red-300 focus:border-red-500"
                          : "border-neutral-300"
                      }`}
                    />
                    {link.errors?.url && (
                      <p className="mt-1 text-sm text-red-600">
                        {link.errors.url}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition-colors"
                  aria-label={`Remove ${link.label || "link"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {links.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
              <p className="text-sm text-neutral-500">
                No social links added yet.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addLink}
            disabled={!canAddMore}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Link
          </button>
          <span className="text-xs text-neutral-500">
            {links.length}/{MAX_LINKS} links
          </span>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving || links.length === 0}
            className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Social Links"}
          </button>
        </div>
      </form>
    </div>
  );
}
