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
  shippingCountry: z.string().length(2, "Shipping country is required"),
  shippingStateCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), {
      message: "State code must be a 2-letter code (e.g. CA, NY)",
    })
    .optional(),
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
  source: "AUTO_SUBSCRIPTION" | "MANUAL";
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

type ArtworkRange = {
  minRequired: number;
  maxAllowed: number;
};

type AutoAssignPublishedReleaseResult = {
  assignedCount: number;
  skippedAtLimitCount: number;
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

async function assertCycleOpen(cycleId: string): Promise<void> {
  const { computeCycleStatus } = await import("@/lib/cycle-status");
  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
    select: {
      lockDate: true,
      status: true,
      fulfillmentDate: true,
      selectionOpenDate: true,
    },
  });
  if (!cycle) {
    throw new Error("Cycle not found");
  }
  const status = computeCycleStatus(cycle as any);
  if (status !== "OPEN") {
    throw new Error(
      `The cycle is ${status.toLowerCase()} and no longer accepts changes.`,
    );
  }
}

async function getActiveArtworkRange(): Promise<ArtworkRange> {
  const activeConstraint = await db.bookletConstraint.findFirst({
    where: { isActive: true },
    select: {
      minPages: true,
      maxPages: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    minRequired: activeConstraint?.minPages ?? MIN_BOOKLET_ARTWORKS,
    maxAllowed: activeConstraint?.maxPages ?? MAX_BOOKLET_ARTWORKS,
  };
}

export async function autoAssignPublishedReleaseToActiveSubscribers(
  releaseId: string,
  creatorProfileId: string,
  cycleId: string,
): Promise<AutoAssignPublishedReleaseResult> {
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
    return { assignedCount: 0, skippedAtLimitCount: 0 };
  }

  const artworkRange = await getActiveArtworkRange();

  const subscriptions = await db.collectorCreatorSubscription.findMany({
    where: {
      creatorProfileId,
      isActive: true,
    },
    select: {
      collectorProfile: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  let assignedCount = 0;
  let skippedAtLimitCount = 0;
  const notifiedUserIds: string[] = [];

  for (const subscription of subscriptions) {
    const collectorProfileId = subscription.collectorProfile.id;

    const existingSelection = await db.collectorReleaseSelection.findUnique({
      where: {
        collectorProfileId_releaseId_cycleId: {
          collectorProfileId,
          releaseId,
          cycleId,
        },
      },
      select: { id: true },
    });

    if (existingSelection) {
      continue;
    }

    const currentArtworkCount = await countSelectedArtworks(
      collectorProfileId,
      cycleId,
    );
    const projectedArtworkCount = currentArtworkCount + release._count.artworks;

    if (projectedArtworkCount > artworkRange.maxAllowed) {
      skippedAtLimitCount += 1;
      continue;
    }

    await db.collectorReleaseSelection.create({
      data: {
        collectorProfileId,
        releaseId,
        cycleId,
      },
    });

    assignedCount += 1;
    notifiedUserIds.push(subscription.collectorProfile.userId);
  }

  if (notifiedUserIds.length > 0) {
    await db.emailNotificationLog.createMany({
      data: notifiedUserIds.map((userId) => ({
        userId,
        type: "COLLECTOR_SELECTION_REMINDER",
        cycleId,
        status: "PENDING",
      })),
    });
  }

  return { assignedCount, skippedAtLimitCount };
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
    shippingStateCode: formData.get("shippingStateCode"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as string;
      errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const shippingCountry = parsed.data.shippingCountry.toUpperCase();
  const shippingStateCode = parsed.data.shippingStateCode || undefined;
  const { displayName } = parsed.data;

  if (shippingCountry === "US" && !shippingStateCode) {
    return {
      success: false,
      errors: {
        shippingStateCode:
          "State code is required for US shipping (e.g. CA, NY).",
      },
    };
  }

  try {
    const fulfillmentCountry = await db.fulfillmentCountry.findUnique({
      where: { code: shippingCountry },
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

    if (shippingCountry === "US" && shippingStateCode) {
      const fulfillmentState = await db.fulfillmentState.findUnique({
        where: {
          countryCode_stateCode: {
            countryCode: "US",
            stateCode: shippingStateCode,
          },
        },
        select: { isActive: true },
      });

      if (!fulfillmentState?.isActive) {
        return {
          success: false,
          errors: {
            shippingStateCode:
              "We do not currently support booklet fulfillment to this US state.",
          },
        };
      }
    }

    await db.collectorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        displayName,
        shippingCountry,
        shippingStateCode,
        onboardingState: "SHIPPING_SET",
      },
      update: {
        displayName,
        shippingCountry,
        shippingStateCode,
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

export async function getCollectorProfile(userId: string) {
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
  options?: { revalidate?: boolean },
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfileOrThrow(session.user.id);

  try {
    const currentCycle = await getCurrentCycle();
    if (currentCycle) {
      await assertCycleOpen(currentCycle.id);
    }

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

    let autoAssignedReleaseTitle: string | null = null;
    let autoAssignmentSkipped = false;

    // Auto-assign this creator's latest published release for current cycle.
    if (currentCycle) {
      const artworkRange = await getActiveArtworkRange();
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

        if (projectedArtworkCount <= artworkRange.maxAllowed) {
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
          autoAssignedReleaseTitle = latestRelease.title;
        } else {
          autoAssignmentSkipped = true;
        }
      }
    }

    if (options?.revalidate !== false) {
      revalidatePath("/collector");
      revalidatePath("/collector/discover");
      revalidatePath("/collector/subscriptions");
      revalidatePath("/collector/releases");
    }
    return {
      success: true,
      autoAssignedReleaseTitle,
      autoAssignmentSkipped,
    };
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
    const currentCycle = await getCurrentCycle();
    if (currentCycle) {
      await assertCycleOpen(currentCycle.id);
    }

    const collectorProfile = await getCollectorProfileOrThrow(session.user.id);

    const result = await db.collectorCreatorSubscription.updateMany({
      where: {
        id: subscriptionId,
        collectorProfileId: collectorProfile.id,
      },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return { success: false, error: "Subscription not found." };
    }

    revalidatePath("/collector");
    revalidatePath("/collector/discover");
    revalidatePath("/collector/releases");
    revalidatePath("/collector/subscriptions");
    return { success: true };
  } catch (error) {
    console.error("Failed to unsubscribe from creator:", error);
    throw error;
  }
}

export async function isUserSubscribedToCreator(
  userId: string,
  creatorProfileId: string,
): Promise<boolean> {
  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId },
  });

  if (!collectorProfile) {
    return false;
  }

  const subscription = await db.collectorCreatorSubscription.findUnique({
    where: {
      collectorProfileId_creatorProfileId: {
        collectorProfileId: collectorProfile.id,
        creatorProfileId,
      },
    },
    select: { isActive: true },
  });

  return subscription?.isActive ?? false;
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
) {
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
    await assertCycleOpen(cycleId);

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
      const artworkRange = await getActiveArtworkRange();
      if (
        currentArtworkCount + release._count.artworks >
        artworkRange.maxAllowed
      ) {
        return {
          success: false,
          error: `Adding this release would exceed the ${artworkRange.maxAllowed} artwork limit.`,
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

export type CommitBookletResult =
  | {
      success: true;
      checkoutIntent: {
        id: string;
        committedAt: Date;
        totalArtworks: number;
        estimatedTotal: number | null;
        currency: string;
      };
    }
  | { success: false; error: string };

export async function commitBookletForCycle(): Promise<CommitBookletResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfileOrThrow(session.user.id);

  const currentCycle = await getCurrentCycle();
  if (!currentCycle) {
    return { success: false, error: "No active subscription cycle." };
  }

  const { computeCycleStatus } = await import("@/lib/cycle-status");
  if (computeCycleStatus(currentCycle) !== "OPEN") {
    return {
      success: false,
      error: "The current cycle is no longer open for commits.",
    };
  }

  if (!collectorProfile.shippingCountry) {
    return {
      success: false,
      error: "Please set your shipping address before committing.",
    };
  }

  const selections = await db.collectorReleaseSelection.findMany({
    where: {
      collectorProfileId: collectorProfile.id,
      cycleId: currentCycle.id,
    },
    include: {
      release: {
        include: {
          _count: { select: { artworks: true } },
        },
      },
    },
  });

  const totalArtworks = selections.reduce(
    (sum, s) => sum + s.release._count.artworks,
    0,
  );

  const artworkRange = await getActiveArtworkRange();
  if (totalArtworks < artworkRange.minRequired) {
    return {
      success: false,
      error: `You need at least ${artworkRange.minRequired} artworks. You currently have ${totalArtworks}.`,
    };
  }
  if (totalArtworks > artworkRange.maxAllowed) {
    return {
      success: false,
      error: `You have ${totalArtworks} artworks, exceeding the ${artworkRange.maxAllowed} limit.`,
    };
  }

  const { computeBookletPageCount } = await import("@/lib/booklet/page-count");
  const pageCountResult = computeBookletPageCount(selections as any);

  let estimatedTotal: number | null = null;
  let currency = "EUR";

  try {
    const { getQuote } = await import("@/lib/peecho/quote-service");
    const quoteData = await getQuote({
      country: collectorProfile.shippingCountry,
      countryStateCode: collectorProfile.shippingStateCode ?? undefined,
      pageCount: pageCountResult.totalPages,
    });

    const { createQuoteSnapshot } = await import(
      "@/lib/pricing/quote-snapshot"
    );
    const snapshot = await createQuoteSnapshot(
      collectorProfile.id,
      currentCycle.id,
      pageCountResult.totalPages,
      quoteData,
    );

    estimatedTotal = Number(snapshot.totalEstimate);
    currency = snapshot.currency;
  } catch {
    // Quote fetch is best-effort during commit; freeze will re-quote
  }

  const selectionSnapshot = selections.map((s) => ({
    releaseId: s.releaseId,
    artworkCount: s.release._count.artworks,
  }));

  const checkoutIntent = await db.checkoutIntent.upsert({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId: collectorProfile.id,
        cycleId: currentCycle.id,
      },
    },
    create: {
      collectorProfileId: collectorProfile.id,
      cycleId: currentCycle.id,
      selectionSnapshot,
      quoteInputCountry: collectorProfile.shippingCountry,
      quoteInputPageCount: pageCountResult.totalPages,
      acceptedEstimateDisclaimer: true,
    },
    update: {
      committedAt: new Date(),
      selectionSnapshot,
      quoteInputCountry: collectorProfile.shippingCountry,
      quoteInputPageCount: pageCountResult.totalPages,
      acceptedEstimateDisclaimer: true,
    },
  });

  revalidatePath("/collector");
  revalidatePath("/collector/discover");

  return {
    success: true,
    checkoutIntent: {
      id: checkoutIntent.id,
      committedAt: checkoutIntent.committedAt,
      totalArtworks,
      estimatedTotal,
      currency,
    },
  };
}

export async function getCollectorCartSummary(
  userId: string,
): Promise<CollectorCartSummary> {
  const artworkRange = await getActiveArtworkRange();

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
      minRequired: artworkRange.minRequired,
      maxAllowed: artworkRange.maxAllowed,
      minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
      maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
      artworksNeeded: artworkRange.minRequired,
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
      minRequired: artworkRange.minRequired,
      maxAllowed: artworkRange.maxAllowed,
      minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
      maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
      artworksNeeded: artworkRange.minRequired,
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
              id: true,
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
    source: "MANUAL",
  }));

  const subscribedCreatorIds = new Set(
    (
      await db.collectorCreatorSubscription.findMany({
        where: {
          collectorProfileId: collectorProfile.id,
          isActive: true,
        },
        select: { creatorProfileId: true },
      })
    ).map((s) => s.creatorProfileId),
  );

  for (const item of selectedReleases) {
    const selection = selections.find((s) => s.releaseId === item.releaseId);
    if (
      selection &&
      subscribedCreatorIds.has(selection.release.creatorProfile.id)
    ) {
      item.source = "AUTO_SUBSCRIPTION";
    }
  }

  const totalArtworks = selectedReleases.reduce(
    (sum, item) => sum + item.artworkCount,
    0,
  );
  const artworksNeeded = Math.max(0, artworkRange.minRequired - totalArtworks);
  const artworksOver = Math.max(0, totalArtworks - artworkRange.maxAllowed);
  const isValidArtworkRange =
    totalArtworks >= artworkRange.minRequired &&
    totalArtworks <= artworkRange.maxAllowed;
  const isValidSubscribedCreatorRange =
    totalSubscribedCreators >= MIN_SUBSCRIBED_CREATORS &&
    totalSubscribedCreators <= MAX_SUBSCRIBED_CREATORS;

  return {
    cycleId: currentCycle.id,
    selectedReleases,
    totalArtworks,
    totalReleases: selectedReleases.length,
    totalSubscribedCreators,
    minRequired: artworkRange.minRequired,
    maxAllowed: artworkRange.maxAllowed,
    minSubscribedCreators: MIN_SUBSCRIBED_CREATORS,
    maxSubscribedCreators: MAX_SUBSCRIBED_CREATORS,
    artworksNeeded,
    artworksOver,
    isValidArtworkRange,
    isValidSubscribedCreatorRange,
    isValidForCheckout: isValidArtworkRange,
  };
}
