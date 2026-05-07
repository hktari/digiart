"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStorageUrl } from "@/lib/s3";

const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens",
  );

const checkSlugSchema = z.object({
  slug: slugSchema,
});

export type CheckSlugResult =
  | { available: true }
  | { available: false; error: string };

export async function checkSlugAvailability(
  _prevState: unknown,
  formData: FormData,
): Promise<CheckSlugResult> {
  const parsed = checkSlugSchema.safeParse({
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { available: false, error: parsed.error.errors[0].message };
  }

  const { slug } = parsed.data;

  const existing = await db.creatorProfile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return { available: false, error: "This slug is already taken" };
  }

  return { available: true };
}

const saveCreatorProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  slug: slugSchema,
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  sourcePlatforms: z.array(z.string()).optional(),
  legalName: z.string().max(100).optional(),
  paypalEmail: z.string().email().optional().or(z.literal("")),
});

export type SaveProfileResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

export async function saveCreatorProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<SaveProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  // Parse sourcePlatforms from JSON string
  const sourcePlatformsRaw = formData.get("sourcePlatforms");
  let sourcePlatforms: string[] | undefined;
  try {
    sourcePlatforms = sourcePlatformsRaw
      ? JSON.parse(sourcePlatformsRaw as string)
      : undefined;
  } catch {
    sourcePlatforms = undefined;
  }

  // Parse platformLinks from JSON string
  const platformLinksRaw = formData.get("platformLinks");
  let platformLinks: Record<string, string> = {};
  try {
    platformLinks = platformLinksRaw
      ? JSON.parse(platformLinksRaw as string)
      : {};
  } catch {
    platformLinks = {};
  }

  const parsed = saveCreatorProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    slug: formData.get("slug"),
    bio: formData.get("bio") || undefined,
    sourcePlatforms,
    legalName: formData.get("legalName") || undefined,
    taxId: formData.get("taxId") || undefined,
    paypalEmail: formData.get("paypalEmail") || "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string;
      errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const {
    displayName,
    slug,
    bio,
    sourcePlatforms: selectedPlatforms,
    legalName,
    paypalEmail,
  } = parsed.data;

  // Convert platforms array to comma-separated string for storage
  const sourcePlatform = selectedPlatforms?.join(",") || null;

  // Check slug availability again (race condition protection)
  const existing = await db.creatorProfile.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== session.user.id) {
    return { success: false, errors: { slug: "This slug is already taken" } };
  }

  // Upsert creator profile
  await db.creatorProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      slug,
      displayName,
      bio: bio || null,
      sourcePlatform,
      status: "PUBLISHED",
      payoutProfile: {
        create: {
          legalName: legalName || null,
          paypalEmail: paypalEmail || null,
          isReady: !!(legalName && paypalEmail),
        },
      },
    },
    update: {
      slug,
      displayName,
      bio: bio || null,
      sourcePlatform,
      payoutProfile: {
        upsert: {
          create: {
            legalName: legalName || null,
            paypalEmail: paypalEmail || null,
            isReady: !!(legalName && paypalEmail),
          },
          update: {
            legalName: legalName || null,
            paypalEmail: paypalEmail || null,
            isReady: !!(legalName && paypalEmail),
          },
        },
      },
    },
  });

  // Save platform links as social links (only entries with a non-empty URL)
  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (profile) {
    const linkEntries = Object.entries(platformLinks).filter(
      ([, url]) => url.trim() !== "",
    );
    for (let i = 0; i < linkEntries.length; i++) {
      const [platformValue, url] = linkEntries[i];
      await db.creatorSocialLink.upsert({
        where: {
          creatorProfileId_label: {
            creatorProfileId: profile.id,
            label: platformValue,
          },
        },
        create: {
          creatorProfileId: profile.id,
          label: platformValue,
          url: url.trim(),
          sortOrder: i,
        },
        update: {
          url: url.trim(),
          sortOrder: i,
        },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/creator");
  revalidatePath("/creator/setup");

  return { success: true };
}

export async function getCreatorProfile(userId: string): Promise<any> {
  return db.creatorProfile.findUnique({
    where: { userId },
    include: { payoutProfile: true },
  });
}

export async function getCreatorDashboardData(): Promise<any> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      payoutProfile: { select: { isReady: true, paypalEmail: true } },
      _count: {
        select: {
          artworks: { where: { status: "ACTIVE" } },
          releases: true,
          subscriptions: { where: { isActive: true } },
        },
      },
    },
  });

  if (!profile) redirect("/creator/setup");

  return profile;
}

export async function saveAvatar(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const key = formData.get("key");
  if (!key || typeof key !== "string" || !key.startsWith("avatars/")) {
    return { success: false, error: "Invalid avatar key" };
  }

  const avatarUrl = getPublicStorageUrl(key);

  await db.creatorProfile.update({
    where: { userId: session.user.id },
    data: { avatar: avatarUrl },
  });

  revalidatePath("/");
  revalidatePath("/creator");
  revalidatePath("/creator/profile");

  return { success: true };
}

const payoutSchema = z.object({
  legalName: z.string().max(100).optional(),
  paypalEmail: z
    .string()
    .email("Enter a valid PayPal email")
    .or(z.literal(""))
    .optional(),
});

export type SavePayoutResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

export async function savePayoutProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<SavePayoutResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const parsed = payoutSchema.safeParse({
    legalName: formData.get("legalName") || undefined,
    paypalEmail: formData.get("paypalEmail") || "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as string] = issue.message;
    }
    return { success: false, errors };
  }

  const { legalName, paypalEmail } = parsed.data;

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) redirect("/creator/setup");

  await db.creatorPayoutProfile.upsert({
    where: { creatorProfileId: profile.id },
    create: {
      creatorProfileId: profile.id,
      legalName: legalName || null,
      paypalEmail: paypalEmail || null,
      isReady: !!(legalName && paypalEmail),
    },
    update: {
      legalName: legalName || null,
      paypalEmail: paypalEmail || null,
      isReady: !!(legalName && paypalEmail),
    },
  });

  revalidatePath("/creator");
  revalidatePath("/creator/profile");

  return { success: true };
}

export async function getPublicCreatorProfile(slug: string): Promise<any> {
  const profile = await db.creatorProfile.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      socialLinks: {
        orderBy: { sortOrder: "asc" },
      },
      releases: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          artworks: {
            include: {
              artwork: {
                select: {
                  id: true,
                  title: true,
                  storageKey: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
          _count: {
            select: { artworks: true },
          },
        },
      },
      _count: {
        select: {
          subscriptions: { where: { isActive: true } },
          releases: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  if (!profile) return null;

  return {
    ...profile,
    releases: profile.releases.map((release) => ({
      ...release,
      artworks: release.artworks.map((ra) => ({
        ...ra,
        artwork: {
          ...ra.artwork,
          thumbnailUrl: getPublicStorageUrl(ra.artwork.storageKey),
        },
      })),
    })),
  };
}

export async function getPublicCreatorReleases(slug: string): Promise<any[]> {
  const profile = await db.creatorProfile.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!profile) {
    return [];
  }

  return db.release.findMany({
    where: {
      creatorProfileId: profile.id,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
    include: {
      artworks: {
        include: {
          artwork: {
            select: {
              id: true,
              title: true,
              storageKey: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      _count: {
        select: { artworks: true },
      },
    },
  });
}

export async function recordProfileView(
  creatorProfileId: string,
  cycleId?: string,
): Promise<void> {
  await db.creatorProfileView.create({
    data: { creatorProfileId, cycleId: cycleId ?? null },
  });
}

export type CreatorDashboardStats = {
  totalSubscribers: number;
  newSubscribersThisCycle: number;
  churnedThisCycle: number;
  selectionsThisCycle: number;
  profileViewsThisCycle: number;
  lastConfirmedPayout: { amount: string; cycleLabel: string } | null;
  pendingPayout: { amount: string } | null;
  artworkCount: number;
  releaseCount: number;
  selectionsBreakdown: { releaseId: string; title: string; count: number }[];
  currentCycle: {
    id: string;
    label: string;
    lockDate: Date;
    selectionOpenDate: Date;
  } | null;
};

export async function getCreatorDashboardStats(): Promise<CreatorDashboardStats | null> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return null;

  const currentCycle = await db.subscriptionCycle.findFirst({
    where: { status: "OPEN" },
    orderBy: { lockDate: "asc" },
  });

  const [
    totalSubscribers,
    newSubscribersThisCycle,
    churnedThisCycle,
    selectionsThisCycle,
    profileViewsThisCycle,
    lastConfirmedPayout,
    pendingPayout,
    counts,
    selectionsByRelease,
  ] = await Promise.all([
    db.collectorCreatorSubscription.count({
      where: { creatorProfileId: profile.id, isActive: true },
    }),
    currentCycle
      ? db.collectorCreatorSubscription.count({
          where: {
            creatorProfileId: profile.id,
            isActive: true,
            createdAt: { gte: currentCycle.selectionOpenDate },
          },
        })
      : 0,
    currentCycle
      ? db.collectorCreatorSubscription.count({
          where: {
            creatorProfileId: profile.id,
            isActive: false,
            updatedAt: { gte: currentCycle.selectionOpenDate },
          },
        })
      : 0,
    currentCycle
      ? db.collectorReleaseSelection.count({
          where: {
            release: { creatorProfileId: profile.id },
            cycleId: currentCycle.id,
          },
        })
      : 0,
    currentCycle
      ? db.creatorProfileView.count({
          where: {
            creatorProfileId: profile.id,
            cycleId: currentCycle.id,
          },
        })
      : 0,
    db.creatorPayout.findFirst({
      where: { creatorProfileId: profile.id, status: "SENT" },
      orderBy: { sentAt: "desc" },
      include: { cycle: { select: { label: true } } },
    }),
    currentCycle
      ? db.creatorPayout.findFirst({
          where: {
            creatorProfileId: profile.id,
            cycleId: currentCycle.id,
            status: "PENDING",
          },
        })
      : null,
    db.creatorProfile.findUnique({
      where: { id: profile.id },
      select: {
        _count: {
          select: {
            artworks: { where: { status: "ACTIVE" } },
            releases: true,
          },
        },
      },
    }),
    currentCycle
      ? db.collectorReleaseSelection.groupBy({
          by: ["releaseId"],
          where: {
            release: { creatorProfileId: profile.id },
            cycleId: currentCycle.id,
          },
          _count: { id: true },
        })
      : [],
  ]);

  let selectionsBreakdown: {
    releaseId: string;
    title: string;
    count: number;
  }[] = [];
  if (selectionsByRelease.length > 0) {
    const releaseIds = selectionsByRelease.map((s) => s.releaseId);
    const releases = await db.release.findMany({
      where: { id: { in: releaseIds } },
      select: { id: true, title: true },
    });
    const titleMap = new Map(releases.map((r) => [r.id, r.title]));
    selectionsBreakdown = selectionsByRelease.map((s) => ({
      releaseId: s.releaseId,
      title: titleMap.get(s.releaseId) ?? "Unknown",
      count: s._count.id,
    }));
  }

  return {
    totalSubscribers,
    newSubscribersThisCycle,
    churnedThisCycle,
    selectionsThisCycle,
    profileViewsThisCycle,
    lastConfirmedPayout: lastConfirmedPayout
      ? {
          amount: lastConfirmedPayout.amount.toString(),
          cycleLabel: lastConfirmedPayout.cycle.label,
        }
      : null,
    pendingPayout: pendingPayout
      ? { amount: pendingPayout.amount.toString() }
      : null,
    artworkCount: counts?._count.artworks ?? 0,
    releaseCount: counts?._count.releases ?? 0,
    selectionsBreakdown,
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          label: currentCycle.label,
          lockDate: currentCycle.lockDate,
          selectionOpenDate: currentCycle.selectionOpenDate,
        }
      : null,
  };
}

export type ReferralStats = {
  referralCode: string;
  shareUrl: string;
  totalSignups: number; // unique subscribers acquired via this referral code
};

export async function getOrGenerateReferralCode(): Promise<ReferralStats> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  let profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, slug: true, referralCode: true },
  });
  if (!profile) redirect("/creator/setup");

  if (!profile.referralCode) {
    // Use slug as the default referral code (already unique)
    profile = await db.creatorProfile.update({
      where: { id: profile.id },
      data: { referralCode: profile.slug },
      select: { id: true, slug: true, referralCode: true },
    });
  }

  const code = profile.referralCode as string;

  const totalSignups = await db.collectorCreatorSubscription.count({
    where: { creatorProfileId: profile.id, referralCode: code, isActive: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shareUrl = `${baseUrl}/creators/${profile.slug}?ref=${code}`;

  return { referralCode: code, shareUrl, totalSignups };
}

export async function getPublicReleaseDetail(
  creatorSlug: string,
  releaseId: string,
): Promise<any> {
  const profile = await db.creatorProfile.findUnique({
    where: { slug: creatorSlug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatar: true,
      bio: true,
    },
  });

  if (!profile) {
    return null;
  }

  const release = await db.release.findFirst({
    where: {
      id: releaseId,
      creatorProfileId: profile.id,
      status: "PUBLISHED",
    },
    include: {
      artworks: {
        include: {
          artwork: {
            select: {
              id: true,
              title: true,
              storageKey: true,
              orientation: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      tags: {
        include: { tag: true },
      },
      _count: {
        select: { artworks: true },
      },
    },
  });

  if (!release) {
    return null;
  }

  return {
    ...release,
    creatorProfile: profile,
    artworks: release.artworks.map((item) => ({
      ...item,
      artwork: {
        ...item.artwork,
        imageUrl: getPublicStorageUrl(item.artwork.storageKey),
      },
    })),
    tags: release.tags.map((item) => item.tag),
  };
}
