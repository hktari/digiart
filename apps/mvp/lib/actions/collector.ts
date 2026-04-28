"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type {
  CollectorProfile,
  CollectorCreatorSubscription,
  CollectorReleaseSelection,
} from "@prisma/client";

const collectorSetupSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  shippingCountry: z.string().min(2, "Shipping country is required"),
});

export type CollectorSetupResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

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
    await db.collectorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        displayName,
        shippingCountry,
        onboardingState: "SHIPPING_SET",
      },
      update: {
        displayName,
        shippingCountry,
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

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    throw new Error("Collector profile not found");
  }

  try {
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

    revalidatePath("/collector/subscriptions");
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

  const collectorProfile = await db.collectorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!collectorProfile) {
    throw new Error("Collector profile not found");
  }

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
      await db.collectorReleaseSelection.create({
        data: {
          collectorProfileId: collectorProfile.id,
          releaseId,
          cycleId,
        },
      });
    }

    revalidatePath("/collector/releases");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle release selection:", error);
    throw error;
  }
}
