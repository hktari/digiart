"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  MAX_BOOKLET_ARTWORKS,
  MAX_SUBSCRIBED_CREATORS,
  MIN_BOOKLET_ARTWORKS,
  MIN_SUBSCRIBED_CREATORS,
} from "@/lib/constants/booklet";
import { db } from "@/lib/db";
import { getCurrentCycle } from "./cycles";

const collectorSetupSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  shippingCountry: z.string().min(2, "Shipping country is required"),
});

export type CollectorSetupResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

type CollectorCartRelease = {
  releaseId: string;
  title: string;
  creatorDisplayName: string;
  creatorSlug: string;
  artworkCount: number;
};

export type CollectorCartSummary = {
  cycleId: string | null;
  selectedReleases: CollectorCartRelease[];
  totalArtworks: number;
  totalReleases: number;
  totalSubscribedCreators: number;
  minRequired: number;
  maxAllowed: number;
  minSubscribedCreators: number;
  maxSubscribedCreators: number;
  artworksNeeded: number;
  artworksOver: number;
  isValidArtworkRange: boolean;
  isValidSubscribedCreatorRange: boolean;
  isValidForCheckout: boolean;
};

async function getCollectorProfileOrThrow(userId: string) {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId },
  });
  if (!collectorProfile) {
    throw new Error("Collector profile not found");
  }
  return collectorProfile;
}

async function countSelectedArtworks(
  collectorProfileId: string,
  cycleId: string,
): Promise<number> {
  const selections = await db.collectorReleaseSelection.findMany({
    where: { collectorProfileId, cycleId },
    select: {
      release: {
        select: {
          _count: {
            select: {
              artworks: true,
            },
          },
        },
      },
    },
  });

  return selections.reduce((total, s) => total + s.release._count.artworks, 0);
}

async function getSubscribedCreatorsCount(collectorProfileId: string) {
  return db.collectorCreatorSubscription.count({
    where: {
      collectorProfileId,
      isActive: true,
    },
  });
}

export async function saveCollectorProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<CollectorSetupResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const parsed = collectorSetupSchema.safeParse({
    displayName: formData.get("displayName"),
    shippingCountry: formData.get("shippingCountry"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string;
      errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const { displayName, shippingCountry } = parsed.data;

  try {
    const fulfillmentCountry = await db.fulfillmentCountry.findUnique({
      where: { code: shippingCountry.toUpperCase() },
      select: { isActive: true },
    });

    if (!fulfillmentCountry?.isActive) {
      return {
        success: false,
        errors: {
          shippingCountry:
            "We do not currently support booklet fulfillment to this country.",
        },
      };
    }

    await db.collectorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        displayName,
        shippingCountry: shippingCountry.toUpperCase(),
        onboardingState: "SHIPPING_SET",
      },
      update: {
        displayName,
        shippingCountry: shippingCountry.toUpperCase(),
        onboardingState: "SHIPPING_SET",
      },
    });

    revalidatePath("/collector/setup");
    return { success: true };
  } catch (error) {
    console.error("Failed to save collector profile:", error);
    return {
      success: false,
      errors: { _form: "Failed to save profile. Please try again." },
    };
  }
}

export async function getCollectorProfile(userId: string): Promise<any> {
  return db.collectorProfile.findUnique({
    where: { userId },
    include: {
      subscriptions: {
        include: {
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
}

export async function subscribeToCreator(
  creatorProfileId: string,
  entryCreatorId?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfileOrThrow(session.user.id);

  try {
    const existing = await db.collectorCreatorSubscription.findUnique({
      where: {
        collectorProfileId_creatorProfileId: {
          collectorProfileId: collectorProfile.id,
          creatorProfileId,
        },
      },
      select: { isActive: true },
    });

    const currentActiveCount = await getSubscribedCreatorsCount(
      collectorProfile.id,
    );
    const activatingNew = !existing?.isActive;
    if (activatingNew && currentActiveCount >= MAX_SUBSCRIBED_CREATORS) {
      return {
        success: false,
        error: `You can subscribe to at most ${MAX_SUBSCRIBED_CREATORS} creators.`,
      };
    }

    await db.collectorCreatorSubscription.upsert({
      where: {
        collectorProfileId_creatorProfileId: {
          collectorProfileId: collectorProfile.id,
          creatorProfileId,
        },
      },
      create: {
        collectorProfileId: collectorProfile.id,
        creatorProfileId,
        entryCreatorId: entryCreatorId || creatorProfileId,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });

    // Auto-assign this creator's latest published release for current cycle.
    const currentCycle = await getCurrentCycle();
    if (currentCycle) {
      const latestRelease = await db.release.findFirst({
        where: {
          creatorProfileId,
          status: "PUBLISHED",
          OR: [{ cycleId: currentCycle.id }, { cycleId: null }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              artworks: true,
            },
          },
        },
      });

      if (latestRelease) {
        const currentArtworkCount = await countSelectedArtworks(
          collectorProfile.id,
          currentCycle.id,
        );
        const projectedArtworkCount =
          currentArtworkCount + latestRelease._count.artworks;

        if (projectedArtworkCount <= MAX_BOOKLET_ARTWORKS) {
          await db.collectorReleaseSelection.upsert({
            where: {
              collectorProfileId_releaseId_cycleId: {
                collectorProfileId: collectorProfile.id,
                releaseId: latestRelease.id,
                cycleId: currentCycle.id,
              },
            },
            create: {
              collectorProfileId: collectorProfile.id,
              releaseId: latestRelease.id,
              cycleId: currentCycle.id,
            },
            update: {},
          });
        }
      }
    }

    revalidatePath("/collector");
    revalidatePath("/collector/discover");
    revalidatePath("/collector/subscriptions");
    revalidatePath("/collector/releases");
    return { success: true };
  } catch (error) {
    console.error("Failed to subscribe to creator:", error);
    throw error;
  }
}

export async function unsubscribeFromCreator(subscriptionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  try {
    await db.collectorCreatorSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });

    revalidatePath("/collector");
    revalidatePath("/collector/subscriptions");
    return { success: true };
  } catch (error) {
    console.error("Failed to unsubscribe from creator:", error);
    throw error;
  }
}

export async function getCollectorSubscriptions(userId: string) {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId },
  });

  if (!collectorProfile) {
    return [];
  }

  return db.collectorCreatorSubscription.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      isActive: true,
    },
    include: {
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          avatar: true,
          bio: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCollectorReleaseSelections(
  userId: string,
  cycleId?: string,
): Promise<any[]> {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId },
  });

  if (!collectorProfile) {
    return [];
  }

  const where: { collectorProfileId: string; cycleId?: string } = {
    collectorProfileId: collectorProfile.id,
  };

  if (cycleId) {
    where.cycleId = cycleId;
  }

  return db.collectorReleaseSelection.findMany({
    where,
    include: {
      release: {
        include: {
          creatorProfile: {
            select: {
              displayName: true,
              slug: true,
            },
          },
          artworks: {
            include: {
              artwork: true,
            },
          },
        },
      },
      cycle: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function toggleReleaseSelection(
  releaseId: string,
  cycleId: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfileOrThrow(session.user.id);

  try {
    const existing = await db.collectorReleaseSelection.findUnique({
      where: {
        collectorProfileId_releaseId_cycleId: {
          collectorProfileId: collectorProfile.id,
          releaseId,
          cycleId,
        },
      },
    });

    if (existing) {
      await db.collectorReleaseSelection.delete({
        where: { id: existing.id },
      });
    } else {
      const release = await db.release.findUnique({
        where: { id: releaseId },
        include: {
          _count: {
            select: {
              artworks: true,
            },
          },
        },
      });

      if (!release || release.status !== "PUBLISHED") {
        return { success: false, error: "Release is not available." };
      }

      const currentArtworkCount = await countSelectedArtworks(
        collectorProfile.id,
        cycleId,
      );
      if (
        currentArtworkCount + release._count.artworks >
        MAX_BOOKLET_ARTWORKS
      ) {
        return {
          success: false,
          error: `Adding this release would exceed the ${MAX_BOOKLET_ARTWORKS} artwork limit.`,
        };
      }

      await db.collectorReleaseSelection.create({
        data: {
          collectorProfileId: collectorProfile.id,
          releaseId,
          cycleId,
        },
      });
    }

    revalidatePath("/collector");
    revalidatePath("/collector/discover");
    revalidatePath("/collector/subscriptions");
    revalidatePath("/collector/releases");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle release selection:", error);
    throw error;
  }
}

export async function getCollectorCartSummary(
  userId: string,
): Promise<CollectorCartSummary> {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!collectorProfile) {
    return {
      cycleId: null,
      selectedReleases: [],
      totalArtworks: 0,
      totalReleases: 0,
      totalSubscribedCreators: 0,
      minRequired: MIN_BOOKLET_ARTWORKS,
      maxAllowed: MAX_BOOKLET_ARTWORKS,
      minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
      maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
      artworksNeeded: MIN_BOOKLET_ARTWORKS,
      artworksOver: 0,
      isValidArtworkRange: false,
      isValidSubscribedCreatorRange: false,
      isValidForCheckout: false,
    };
  }

  const currentCycle = await getCurrentCycle();
  const totalSubscribedCreators = await getSubscribedCreatorsCount(
    collectorProfile.id,
  );

  if (!currentCycle) {
    return {
      cycleId: null,
      selectedReleases: [],
      totalArtworks: 0,
      totalReleases: 0,
      totalSubscribedCreators,
      minRequired: MIN_BOOKLET_ARTWORKS,
      maxAllowed: MAX_BOOKLET_ARTWORKS,
      minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
      maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
      artworksNeeded: MIN_BOOKLET_ARTWORKS,
      artworksOver: 0,
      isValidArtworkRange: false,
      isValidSubscribedCreatorRange:
        totalSubscribedCreators >= MIN_SUBSCRIBED_CREATORS &&
        totalSubscribedCreators <= MAX_SUBSCRIBED_CREATORS,
      isValidForCheckout: false,
    };
  }

  const selections = await db.collectorReleaseSelection.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      cycleId: currentCycle.id,
    },
    select: {
      releaseId: true,
      release: {
        select: {
          title: true,
          creatorProfile: {
            select: {
              displayName: true,
              slug: true,
            },
          },
          _count: {
            select: {
              artworks: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const selectedReleases: CollectorCartRelease[] = selections.map((s) => ({
    releaseId: s.releaseId,
    title: s.release.title,
    creatorDisplayName: s.release.creatorProfile.displayName,
    creatorSlug: s.release.creatorProfile.slug,
    artworkCount: s.release._count.artworks,
  }));

  const totalArtworks = selectedReleases.reduce(
    (sum, item) => sum + item.artworkCount,
    0,
  );
  const artworksNeeded = Math.max(0, MIN_BOOKLET_ARTWORKS - totalArtworks);
  const artworksOver = Math.max(0, totalArtworks - MAX_BOOKLET_ARTWORKS);
  const isValidArtworkRange =
    totalArtworks >= MIN_BOOKLET_ARTWORKS &&
    totalArtworks <= MAX_BOOKLET_ARTWORKS;
  const isValidSubscribedCreatorRange =
    totalSubscribedCreators >= MIN_SUBSCRIBED_CREATORS &&
    totalSubscribedCreators <= MAX_SUBSCRIBED_CREATORS;

  return {
    cycleId: currentCycle.id,
    selectedReleases,
    totalArtworks,
    totalReleases: selectedReleases.length,
    totalSubscribedCreators,
    minRequired: MIN_BOOKLET_ARTWORKS,
    maxAllowed: MAX_BOOKLET_ARTWORKS,
    minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
    maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
    artworksNeeded,
    artworksOver,
    isValidArtworkRange,
    isValidSubscribedCreatorRange,
    isValidForCheckout: isValidArtworkRange && isValidSubscribedCreatorRange,
  };
}
