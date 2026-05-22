"use client";

import { PencilIcon } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import {
  type CheckSlugResult,
  checkSlugAvailability,
  saveCreatorProfile,
} from "@/lib/actions/creator";

interface ProfileInfoFormProps {
  initialData: {
    displayName: string;
    slug: string;
    bio?: string | null;
    sourcePlatform?: string | null;
  };
}

const SOURCE_PLATFORMS = [
  { value: "deviantart", label: "DeviantArt" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "midjourney", label: "Midjourney" },
  { value: "discord", label: "Discord" },
  { value: "leonardo", label: "Leonardo.ai" },
  { value: "artstation", label: "ArtStation" },
  { value: "behance", label: "Behance" },
  { value: "dribbble", label: "Dribbble" },
  { value: "pixiv", label: "Pixiv" },
  { value: "seaart", label: "SeaArt" },
  { value: "other", label: "Other" },
] as const;

export function ProfileInfoForm({ initialData }: ProfileInfoFormProps) {
  const [formData, setFormData] = useState({
    displayName: initialData.displayName,
    slug: initialData.slug,
    bio: initialData.bio ?? "",
    sourcePlatforms:
      initialData.sourcePlatform?.split(",").filter(Boolean) ?? [],
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true);
  const [slugEditing, setSlugEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [saveState, saveAction, isSaving] = useActionState(
    async (_prevState: unknown, formDataInput: FormData) => {
      setSaveSuccess(false);
      const result = await saveCreatorProfile(_prevState, formDataInput);
      if (result.success) {
        setSaveSuccess(true);
      }
      return result;
    },
    null,
  );

  const [slugCheckState, slugCheckAction, isCheckingSlug] = useActionState(
    checkSlugAvailability,
    null,
  );

  const toSlug = useCallback(
    (name: string) =>
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50),
    [],
  );

  const updateField = useCallback(
    (field: keyof typeof formData, value: string | string[]) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "displayName" && !slugManuallyEdited) {
          next.slug = toSlug(value as string);
        }
        return next;
      });
      setSaveSuccess(false);
    },
    [slugManuallyEdited, toSlug],
  );

  const togglePlatform = useCallback((platformValue: string) => {
    setFormData((prev) => {
      const current = prev.sourcePlatforms;
      const isRemoving = current.includes(platformValue);
      const updated = isRemoving
        ? current.filter((p) => p !== platformValue)
        : [...current, platformValue];
      return { ...prev, sourcePlatforms: updated };
    });
    setSaveSuccess(false);
  }, []);

  const isSlugAvailable = slugCheckState?.available === true;
  const isSlugTaken = slugCheckState?.available === false;

  const allErrors = saveState?.success === false ? saveState.errors : {};

  return (
    <form action={saveAction} className="space-y-6">
      {saveSuccess && (
        <div className="rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm text-success-foreground">
          Profile information saved successfully.
        </div>
      )}

      {/* Hidden inputs for all form data */}
      <input type="hidden" name="displayName" value={formData.displayName} />
      <input type="hidden" name="slug" value={formData.slug} />
      <input type="hidden" name="bio" value={formData.bio} />
      <input
        type="hidden"
        name="sourcePlatforms"
        value={JSON.stringify(formData.sourcePlatforms)}
      />
      <input type="hidden" name="paypalEmail" value="" />
      <input type="hidden" name="platformLinks" value="{}" />

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Display Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="displayName"
          value={formData.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          placeholder="Your artist name"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
            allErrors.displayName
              ? "border-destructive-border focus:border-destructive-border"
              : "border"
          }`}
        />
        {allErrors.displayName && (
          <p className="mt-1 text-sm text-destructive">
            {allErrors.displayName}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-foreground/80"
          >
            Profile Slug <span className="text-destructive">*</span>
          </label>
          {!slugEditing ? (
            <button
              type="button"
              onClick={() => setSlugEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <PencilIcon className="w-3 h-3" />
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const reset = toSlug(formData.displayName);
                setFormData((prev) => ({ ...prev, slug: reset }));
                setSlugManuallyEdited(false);
                setSlugEditing(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset to auto
            </button>
          )}
        </div>
        {slugEditing ? (
          <div className="flex gap-2">
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                updateField("slug", e.target.value.toLowerCase());
              }}
              onBlur={() => {
                if (formData.slug) setSlugEditing(false);
              }}
              placeholder="your-name"
              className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                allErrors.slug
                  ? "border-destructive-border focus:border-destructive-border"
                  : "border"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("slug", formData.slug);
                slugCheckAction(fd);
              }}
              disabled={!formData.slug || isCheckingSlug}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingSlug ? "Checking..." : "Check"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSlugEditing(true)}
            className={`w-full text-left rounded-lg border px-3 py-2 text-sm bg-muted/40 text-foreground/70 ${
              allErrors.slug ? "border-destructive-border" : "border"
            }`}
          >
            {formData.slug || (
              <span className="text-muted-foreground">your-name</span>
            )}
          </button>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {process.env.NEXT_PUBLIC_APP_URL}/creators/
          {formData.slug || "your-name"}
        </p>
        {allErrors.slug && (
          <p className="mt-1 text-sm text-destructive">{allErrors.slug}</p>
        )}
        {isSlugAvailable && (
          <p className="mt-1 text-sm text-success-foreground">
            This slug is available!
          </p>
        )}
        {isSlugTaken && (
          <p className="mt-1 text-sm text-destructive">
            {(slugCheckState as CheckSlugResult & { available: false }).error}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-foreground/80 mb-1"
        >
          Bio
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          placeholder="Tell collectors about yourself and your art..."
          rows={4}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
            allErrors.bio
              ? "border-destructive-border focus:border-destructive-border"
              : "border"
          }`}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {formData.bio.length}/500 characters
        </p>
        {allErrors.bio && (
          <p className="mt-1 text-sm text-destructive">{allErrors.bio}</p>
        )}
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground/80 mb-2">
          Where do you currently share your art?
        </legend>
        <div className="flex flex-wrap gap-2">
          {SOURCE_PLATFORMS.map((platform) => {
            const isSelected = formData.sourcePlatforms.includes(
              platform.value,
            );
            return (
              <button
                key={platform.value}
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-fuchsia-600 text-white"
                    : "bg-muted text-foreground hover:bg-accent border"
                }`}
              >
                {platform.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Select all that apply. This helps us understand our creator community
          better.
        </p>
      </fieldset>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
