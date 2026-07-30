"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { formatEur, magazinePriceCents } from "@/lib/collect/pricing";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { deleteStorageObject } from "@/lib/s3";

const emailSchema = z.string().email();

export type SaveCollectionEmailState = {
  status: "sent" | "invalid" | "error";
  message: string;
} | null;

function collectionEmailBody(url: string, itemCount: number) {
  const pieces = `${itemCount} ${itemCount === 1 ? "piece" : "pieces"}`;
  return {
    subject: "Your collection on PrintFeed",
    text: [
      `Here is the link to your collection — ${pieces}, yours to keep:`,
      "",
      url,
      "",
      "Open it any time to add to it, remove pieces, or print it as a magazine.",
    ].join("\n"),
    html: [
      `<p>Here is the link to your collection — ${pieces}, yours to keep:</p>`,
      `<p><a href="${url}">${url}</a></p>`,
      "<p>Open it any time to add to it, remove pieces, or print it as a magazine.</p>",
    ].join(""),
  };
}

/**
 * Value-moment email capture: enriches the anonymous collector lead + collection
 * with an email so the collection is portable and the collector is reachable,
 * then sends the link the form promises.
 *
 * The save happens first and the result is reported separately, so a Resend
 * outage still captures the lead rather than losing it along with the send.
 */
export async function saveCollectionEmail(
  token: string,
  _prevState: SaveCollectionEmailState,
  formData: FormData,
): Promise<NonNullable<SaveCollectionEmailState>> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "invalid", message: "That email doesn't look right." };
  }
  const email = parsed.data.toLowerCase();

  const collection = await db.collection.findUnique({
    where: { token },
    include: { _count: { select: { items: true } } },
  });
  if (!collection) {
    return { status: "error", message: "We couldn't find that collection." };
  }

  await db.collection.update({ where: { token }, data: { email } });
  if (collection.collectorLeadId) {
    await db.lead.update({
      where: { id: collection.collectorLeadId },
      data: { email, lastSeenAt: new Date() },
    });
  }
  revalidatePath(`/c/${token}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    logger.error("[collect] NEXT_PUBLIC_APP_URL unset; cannot email a link", {
      token,
    });
    return {
      status: "error",
      message: "Saved, but we couldn't send the email. Bookmark this page.",
    };
  }

  const { subject, text, html } = collectionEmailBody(
    `${baseUrl.replace(/\/$/, "")}/c/${token}`,
    collection._count.items,
  );
  const { sent, error } = await sendEmail({ to: email, subject, html, text });
  if (!sent) {
    logger.error("[collect] collection link email failed", { token, error });
    return {
      status: "error",
      message: "Saved, but we couldn't send the email. Bookmark this page.",
    };
  }

  return { status: "sent", message: `Sent — check ${email}.` };
}

/**
 * Removes one collected item from a collection. The guest token is the
 * capability — anyone holding the link can curate the collection — so we scope
 * the delete to the item's own collection rather than requiring auth. Durable
 * storage is cleaned up best-effort.
 */
export async function removeCollectionItem(
  token: string,
  itemId: string,
): Promise<void> {
  const collection = await db.collection.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!collection) return;

  const item = await db.collectedItem.findFirst({
    where: { id: itemId, collectionId: collection.id },
    select: { id: true, storageKey: true },
  });
  if (!item) return;

  await db.collectedItem.delete({ where: { id: item.id } });
  try {
    await deleteStorageObject(item.storageKey);
  } catch (error) {
    // Orphaned S3 objects are harmless; don't fail the removal on cleanup.
    logger.error("[collect] deleteStorageObject failed", {
      key: item.storageKey,
      error,
    });
  }
  revalidatePath(`/c/${token}`);
  revalidatePath(`/c/${token}/print`);
}

function reservationEmailBody(url: string, itemCount: number, price: string) {
  const pieces = `${itemCount} ${itemCount === 1 ? "piece" : "pieces"}`;
  return {
    subject: "Your magazine is reserved",
    text: [
      `We've held a place for your collection — ${pieces}, around ${price} to print and ship.`,
      "",
      "Nothing has been charged. We'll email you as soon as printing opens,",
      "and you'll confirm before anything is paid for or produced.",
      "",
      `Your collection: ${url}`,
    ].join("\n"),
    html: [
      `<p>We've held a place for your collection — ${pieces}, around ${price} to print and ship.</p>`,
      "<p><strong>Nothing has been charged.</strong> We'll email you as soon as printing opens, and you'll confirm before anything is paid for or produced.</p>",
      `<p>Your collection: <a href="${url}">${url}</a></p>`,
    ].join(""),
  };
}

/**
 * Conversion event (collector side): links the collection to the signed-in user,
 * advances the collector lead to SIGNED_UP, and confirms the reservation by
 * email.
 *
 * This reserves a magazine; it does not order one. There is no order path from
 * a Collection yet — no quote, no payment, no print job — so the confirmation
 * deliberately says nothing has been charged. Do not let this or the print
 * page's copy imply otherwise until that pipeline exists.
 */
export async function claimCollection(token: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const collection = await db.collection.findUnique({
    where: { token },
    include: { _count: { select: { items: true } } },
  });
  if (!collection || collection.ownerUserId) return;

  await db.collection.update({
    where: { token },
    data: { ownerUserId: userId },
  });

  if (collection.collectorLeadId) {
    // Lead.ownerUserId is unique across ALL leads, so a user who already owns
    // one — typically a creator lead claimed at /claim/<handle> — cannot own
    // their collector lead as well. Linking unconditionally threw, and the
    // catch around the whole block swallowed it, leaving the collection
    // claimed while its lead stayed NEW. The status advance is the part the
    // funnel actually measures, so it must not ride on the link succeeding.
    const alreadyOwns = await db.lead.findUnique({
      where: { ownerUserId: userId },
    });
    const canLink =
      !alreadyOwns || alreadyOwns.id === collection.collectorLeadId;

    try {
      await db.lead.update({
        where: { id: collection.collectorLeadId },
        data: {
          status: "SIGNED_UP",
          ownerUserId: canLink ? userId : undefined,
          lastSeenAt: new Date(),
        },
      });
    } catch (error) {
      // The collection is claimed either way; losing the lead bookkeeping is
      // a reporting problem, not a reason to fail the user's action.
      logger.error("[collect] could not advance collector lead", {
        token,
        leadId: collection.collectorLeadId,
        error,
      });
    }
  }

  revalidatePath(`/c/${token}`);
  revalidatePath(`/c/${token}/print`);

  // Reserving is otherwise invisible — the panel changes and nothing else
  // happens for weeks — so confirm it in writing. Prefer the address the
  // collector saved on the collection, falling back to the account they
  // signed in with.
  const to = collection.email ?? session?.user?.email;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!to || !baseUrl) {
    logger.error("[collect] cannot confirm reservation", {
      token,
      hasRecipient: Boolean(to),
      hasBaseUrl: Boolean(baseUrl),
    });
    return;
  }

  const { subject, text, html } = reservationEmailBody(
    `${baseUrl.replace(/\/$/, "")}/c/${token}`,
    collection._count.items,
    formatEur(magazinePriceCents(collection._count.items)),
  );
  const { sent, error } = await sendEmail({ to, subject, html, text });
  if (!sent) {
    logger.error("[collect] reservation email failed", { token, error });
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
