"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  type CheckSlugResult,
  checkSlugAvailability,
  saveCreatorProfile,
} from "@/lib/actions/creator";
import { InlineArtworkUploader } from "./inline-artwork-uploader";

type Step = "profile" | "payout" | "review" | "artwork" | "share";

const SOURCE_PLATFORMS = [
  { value: "artstation", label: "ArtStation" },
  { value: "deviantart", label: "DeviantArt" },
  { value: "instagram", label: "Instagram" },
  { value: "behance", label: "Behance" },
  { value: "dribbble", label: "Dribbble" },
  { value: "twitter", label: "Twitter/X" },
  { value: "cara", label: "Cara" },
  { value: "pixiv", label: "Pixiv" },
  { value: "midjourney", label: "Midjourney" },
  { value: "discord", label: "Discord" },
  { value: "leonardo", label: "Leonardo.ai" },
  { value: "seaart", label: "SeaArt" },
  { value: "other", label: "Other" },
] as const;

interface CreatorSetupFormProps {
  initialData?: {
    displayName?: string;
    slug?: string;
    bio?: string;
    sourcePlatforms?: string[];
    legalName?: string;
    paypalEmail?: string;
  };
}

interface FormData {
  displayName: string;
  slug: string;
  bio: string;
  sourcePlatforms: string[];
  legalName: string;
  paypalEmail: string;
}

export function CreatorSetupForm({ initialData }: CreatorSetupFormProps) {
  const [step, setStep] = useState<Step>("profile");
  const [, startTransition] = useTransition();
  const [formData, setFormData] = useState<FormData>({
    displayName: initialData?.displayName ?? "",
    slug: initialData?.slug ?? "",
    bio: initialData?.bio ?? "",
    sourcePlatforms: initialData?.sourcePlatforms ?? [],
    legalName: initialData?.legalName ?? "",
    paypalEmail: initialData?.paypalEmail ?? "",
  });
  const [_isComplete, _setIsComplete] = useState(false);
  const [uploadedArtworks, setUploadedArtworks] = useState<string[]>([]);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [slugCheckState, slugCheckAction, isCheckingSlug] = useActionState(
    checkSlugAvailability,
    null,
  );
  const [saveState, saveAction, isSaving] = useActionState(
    saveCreatorProfile,
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // PayPal verification state
  const [payPalStatus, setPayPalStatus] = useState<{
    isVerified: boolean;
    verifiedAt: string | null;
    isLoading: boolean;
  }>({ isVerified: false, verifiedAt: null, isLoading: true });

  // Load PayPal verification status on mount
  useEffect(() => {
    async function loadPayPalStatus() {
      try {
        const response = await fetch("/api/paypal/status");
        if (response.ok) {
          const data = await response.json();
          setPayPalStatus({
            isVerified: data.isVerified,
            verifiedAt: data.verifiedAt,
            isLoading: false,
          });
        }
      } catch {
        // Silently fail - verification is optional
      } finally {
        setPayPalStatus((prev) => ({ ...prev, isLoading: false }));
      }
    }
    void loadPayPalStatus();
  }, []);

  // Check for PayPal verification success in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("paypal_verified") === "true") {
        setPayPalStatus({
          isVerified: true,
          verifiedAt: new Date().toISOString(),
          isLoading: false,
        });
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const updateField = useCallback(
    (field: keyof FormData, value: string | string[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field when user types
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const togglePlatform = useCallback((platformValue: string) => {
    setFormData((prev) => {
      const current = prev.sourcePlatforms;
      const updated = current.includes(platformValue)
        ? current.filter((p) => p !== platformValue)
        : [...current, platformValue];
      return { ...prev, sourcePlatforms: updated };
    });
    // Clear error for this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.sourcePlatforms;
      return next;
    });
  }, []);

  const validateProfileStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      errors.displayName = "Display name is required";
    }

    if (!formData.slug.trim()) {
      errors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug =
        "Slug can only contain lowercase letters, numbers, and hyphens";
    } else if (formData.slug.length < 3) {
      errors.slug = "Slug must be at least 3 characters";
    }

    if (formData.bio.length > 500) {
      errors.bio = "Bio must be at most 500 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleProfileNext = useCallback(() => {
    if (validateProfileStep()) {
      setStep("payout");
    }
  }, [validateProfileStep]);

  const validatePayoutStep = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Validate PayPal email if provided
    if (formData.paypalEmail) {
      // RFC 5322 compliant email regex for better validation
      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(formData.paypalEmail)) {
        errors.paypalEmail = "Please enter a valid PayPal email address";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handlePayoutNext = useCallback(() => {
    if (validatePayoutStep()) {
      setStep("review");
    }
  }, [validatePayoutStep]);

  const handleReviewNext = useCallback(() => {
    // Save profile before moving to artwork step
    const fd = new FormData();
    fd.append("displayName", formData.displayName);
    fd.append("slug", formData.slug);
    fd.append("bio", formData.bio);
    fd.append("sourcePlatforms", JSON.stringify(formData.sourcePlatforms));
    fd.append("legalName", formData.legalName);
    fd.append("paypalEmail", formData.paypalEmail);

    setHasTransitioned(false);
    startTransition(() => {
      saveAction(fd);
    });
  }, [formData, saveAction]);

  useEffect(() => {
    if (saveState?.success && !hasTransitioned && step === "review") {
      setHasTransitioned(true);
      setStep("artwork");
    }
  }, [saveState, hasTransitioned, step]);

  const handleBack = useCallback(() => {
    if (step === "payout") setStep("profile");
    else if (step === "review") setStep("payout");
    else if (step === "artwork") setStep("review");
    else if (step === "share") setStep("artwork");
  }, [step]);

  const isSlugAvailable = slugCheckState?.available === true;
  const isSlugTaken = slugCheckState?.available === false;

  // Merge server errors with client errors
  const allErrors =
    saveState?.success === false
      ? { ...fieldErrors, ...saveState.errors }
      : fieldErrors;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Creator Setup
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Complete your profile to start publishing releases.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 flex-1 rounded-full ${
              step === "profile" ? "bg-fuchsia-500" : "bg-fuchsia-200"
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${
              step === "payout"
                ? "bg-fuchsia-500"
                : step === "review"
                  ? "bg-fuchsia-200"
                  : "bg-neutral-200"
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${
              step === "review"
                ? "bg-fuchsia-500"
                : step === "artwork"
                  ? "bg-fuchsia-200"
                  : "bg-neutral-200"
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${
              step === "artwork"
                ? "bg-fuchsia-500"
                : step === "share"
                  ? "bg-fuchsia-200"
                  : "bg-neutral-200"
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${
              step === "share" ? "bg-fuchsia-500" : "bg-neutral-200"
            }`}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>Profile</span>
          <span>Payout</span>
          <span>Review</span>
          <span>Artwork</span>
          <span>Share</span>
        </div>
      </div>

      <form action={saveAction} className="space-y-6">
        {/* Hidden inputs for all form data (used when submitting from share step) */}
        <input type="hidden" name="displayName" value={formData.displayName} />
        <input type="hidden" name="slug" value={formData.slug} />
        <input type="hidden" name="bio" value={formData.bio} />
        <input
          type="hidden"
          name="sourcePlatforms"
          value={JSON.stringify(formData.sourcePlatforms)}
        />
        <input type="hidden" name="legalName" value={formData.legalName} />
        <input type="hidden" name="paypalEmail" value={formData.paypalEmail} />

        {/* Step 1: Profile */}
        {step === "profile" && (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                placeholder="Your artist name"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                  allErrors.displayName
                    ? "border-red-300 focus:border-red-500"
                    : "border-neutral-300"
                }`}
              />
              {allErrors.displayName && (
                <p className="mt-1 text-sm text-red-600">
                  {allErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Profile Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    updateField("slug", e.target.value.toLowerCase())
                  }
                  placeholder="your-name"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                    allErrors.slug
                      ? "border-red-300 focus:border-red-500"
                      : "border-neutral-300"
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
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingSlug ? "Checking..." : "Check"}
                </button>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {process.env.NEXT_PUBLIC_APP_URL}/creators/
                {formData.slug || "your-name"}
              </p>
              {allErrors.slug && (
                <p className="mt-1 text-sm text-red-600">{allErrors.slug}</p>
              )}
              {isSlugAvailable && (
                <p className="mt-1 text-sm text-jade-600">
                  This slug is available!
                </p>
              )}
              {isSlugTaken && (
                <p className="mt-1 text-sm text-red-600">
                  {
                    (slugCheckState as CheckSlugResult & { available: false })
                      .error
                  }
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell collectors about yourself and your art..."
                rows={4}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                  allErrors.bio
                    ? "border-red-300 focus:border-red-500"
                    : "border-neutral-300"
                }`}
              />
              <p className="mt-1 text-xs text-neutral-500">
                {formData.bio.length}/500 characters
              </p>
              {allErrors.bio && (
                <p className="mt-1 text-sm text-red-600">{allErrors.bio}</p>
              )}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-neutral-700 mb-2">
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
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-300"
                      }`}
                    >
                      {platform.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Select all that apply. This helps us understand our creator
                community better.
              </p>
            </fieldset>

            <button
              type="button"
              onClick={handleProfileNext}
              className="w-full rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
            >
              Continue to Payout Settings
            </button>
          </div>
        )}

        {/* Step 2: Payout */}
        {step === "payout" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-beige-200 bg-beige-50 p-4">
              <p className="text-sm text-beige-800">
                <strong>Optional:</strong> You can complete payout information
                later, but you&apos;ll need it to receive payments.
              </p>
            </div>

            <div>
              <label
                htmlFor="legalName"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Legal Name
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={(e) => updateField("legalName", e.target.value)}
                placeholder="Your full legal name"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                  allErrors.legalName
                    ? "border-red-300 focus:border-red-500"
                    : "border-neutral-300"
                }`}
              />
              {allErrors.legalName && (
                <p className="mt-1 text-sm text-red-600">
                  {allErrors.legalName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="paypalEmail"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                PayPal Email
              </label>
              <input
                type="email"
                id="paypalEmail"
                name="paypalEmail"
                value={formData.paypalEmail}
                onChange={(e) => updateField("paypalEmail", e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
                  allErrors.paypalEmail
                    ? "border-red-300 focus:border-red-500"
                    : "border-neutral-300"
                }`}
              />
              {allErrors.paypalEmail && (
                <p className="mt-1 text-sm text-red-600">
                  {allErrors.paypalEmail}
                </p>
              )}

              {/* PayPal Verification UI */}
              {formData.paypalEmail && !allErrors.paypalEmail && (
                <div className="mt-3">
                  {payPalStatus.isLoading ? (
                    <span className="text-sm text-neutral-500">
                      Checking verification status...
                    </span>
                  ) : payPalStatus.isVerified ? (
                    <div className="flex items-center gap-2 text-jade-700 bg-jade-50 rounded-lg px-3 py-2">
                      <CheckIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        PayPal account verified
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-neutral-600">
                        Optional: Verify your PayPal account to ensure smooth
                        payouts
                      </p>
                      <a
                        href={`/api/paypal/connect?email=${encodeURIComponent(formData.paypalEmail)}&returnTo=${encodeURIComponent("/creator/setup")}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0070BA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005ea6] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.63l-1.496 9.478h2.79c.457 0 .85-.334.922-.788l.04-.19.73-4.627.047-.255a.933.933 0 0 1 .922-.788h.58c3.76 0 6.704-1.528 7.565-5.946.354-1.818.177-3.334-.777-4.57l-.226-.298z" />
                        </svg>
                        Connect with PayPal
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePayoutNext}
                className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-200 p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Display Name
                </p>
                <p className="text-sm text-neutral-900">
                  {formData.displayName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Profile URL
                </p>
                <p className="text-sm text-neutral-900">
                  {process.env.NEXT_PUBLIC_APP_URL}/creators/{formData.slug}
                </p>
              </div>
              {formData.bio && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Bio
                  </p>
                  <p className="text-sm text-neutral-900 line-clamp-3">
                    {formData.bio}
                  </p>
                </div>
              )}
              {formData.sourcePlatforms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Current Platforms
                  </p>
                  <p className="text-sm text-neutral-900">
                    {formData.sourcePlatforms
                      .map(
                        (value) =>
                          SOURCE_PLATFORMS.find((p) => p.value === value)
                            ?.label,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Payout Ready
                </p>
                <p className="text-sm text-neutral-900">
                  {formData.legalName && formData.paypalEmail
                    ? "Yes - Legal name and PayPal provided"
                    : "No - Complete payout info later"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReviewNext}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Artwork Upload */}
        {step === "artwork" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-beige-200 bg-beige-50 p-4">
              <p className="text-sm text-beige-800">
                <strong>Recommended:</strong> Upload at least 5 artworks to make
                your profile more attractive to collectors. You can always add
                more later.
              </p>
            </div>

            <InlineArtworkUploader
              initialCount={uploadedArtworks.length}
              onUploadComplete={(artworkIds) => {
                setUploadedArtworks((prev) => [...prev, ...artworkIds]);
              }}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("share")}
                className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
              >
                {uploadedArtworks.length >= 5 ? "Continue" : "Skip for now"}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Share */}
        {step === "share" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-jade-200 bg-jade-50 p-4 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-lg font-semibold text-jade-900">
                You&apos;re all set!
              </h2>
              <p className="text-sm text-jade-700 mt-1">
                Your creator profile is ready. Share it with your audience to
                start growing your collector base.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="creator-profile-link"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Your Profile Link
                </label>
                <div className="flex gap-2">
                  <input
                    id="creator-profile-link"
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_APP_URL}/creators/${formData.slug}`}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50 text-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_APP_URL}/creators/${formData.slug}`,
                      );
                      // Could add toast notification here
                    }}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my art on this new platform! ${process.env.NEXT_PUBLIC_APP_URL}/creators/${formData.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-center"
                >
                  Share on Twitter/X
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/creators/${formData.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-center"
                >
                  Share on Facebook
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <Link
                href="/"
                className="flex-1 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
