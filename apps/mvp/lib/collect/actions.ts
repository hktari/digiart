"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const emailSchema = z.string().email();

/**
 * Value-moment email capture: enriches the anonymous collector lead + collection
 * with an email so the collection is portable and the collector is reachable.
 */
export async function saveCollectionEmail(
  token: string,
  formData: FormData,
): Promise<void> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return;
  const email = parsed.data.toLowerCase();

  const collection = await db.collection.findUnique({ where: { token } });
  if (!collection) return;

  await db.collection.update({ where: { token }, data: { email } });
  if (collection.collectorLeadId) {
    await db.lead.update({
      where: { id: collection.collectorLeadId },
      data: { email, lastSeenAt: new Date() },
    });
  }
  revalidatePath(`/c/${token}`);
}

/**
 * Conversion event (collector side): links the collection to the signed-in user
 * and advances the collector lead to SIGNED_UP. Called when an authenticated
 * user returns to a collection/print page after activating.
 */
export async function claimCollection(token: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const collection = await db.collection.findUnique({ where: { token } });
  if (!collection || collection.ownerUserId) return;

  try {
    await db.collection.update({
      where: { token },
      data: { ownerUserId: userId },
    });
    if (collection.collectorLeadId) {
      await db.lead.update({
        where: { id: collection.collectorLeadId },
        data: {
          status: "SIGNED_UP",
          ownerUserId: userId,
          lastSeenAt: new Date(),
        },
      });
    }
    revalidatePath(`/c/${token}`);
    revalidatePath(`/c/${token}/print`);
  } catch (error) {
    // ownerUserId is unique per user/collection — a second link is a no-op.
    logger.error("[collect] claimCollection failed", { token, error });
  }
}

/**
 * Conversion event (creator side): advances the creator lead for a handle to
 * SIGNED_UP when an authenticated user lands on the claim page.
 */
export async function claimCreatorLead(handle: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const normalized = handle.replace(/^@/, "").toLowerCase();

  const lead = await db.lead.findFirst({
    where: { type: "CREATOR", sourceHandle: normalized },
  });
  if (!lead || lead.status === "SIGNED_UP" || lead.status === "ACTIVATED")
    return;

  // ownerUserId is unique per Lead; if this user already owns another lead
  // (e.g. their collector lead), keep the status advance and skip the link.
  const alreadyOwns = await db.lead.findUnique({
    where: { ownerUserId: session.user.id },
  });

  await db.lead.update({
    where: { id: lead.id },
    data: {
      status: "SIGNED_UP",
      ownerUserId: alreadyOwns ? undefined : session.user.id,
      lastSeenAt: new Date(),
    },
  });
  revalidatePath(`/claim/${normalized}`);
}
