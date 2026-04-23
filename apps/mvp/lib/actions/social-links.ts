"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const socialLinkSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  url: z.string().url("Must be a valid URL"),
});

const _saveSocialLinksSchema = z.object({
  links: z.array(socialLinkSchema).max(10, "Maximum 10 social links allowed"),
});

export interface SocialLink {
  id?: string;
  label: string;
  url: string;
}

export type SaveSocialLinksResult =
  | { success: true }
  | {
      success: false;
      errors: { index: number; field: string; message: string }[];
    };

export async function saveSocialLinks(
  links: SocialLink[],
): Promise<SaveSocialLinksResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  // Validate links
  const errors: { index: number; field: string; message: string }[] = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const parsed = socialLinkSchema.safeParse(link);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          index: i,
          field: issue.path[0] as string,
          message: issue.message,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Get creator profile
  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    redirect("/creator/setup");
  }

  // Delete existing links
  await db.creatorSocialLink.deleteMany({
    where: { creatorProfileId: profile.id },
  });

  // Create new links with sort order
  if (links.length > 0) {
    await db.creatorSocialLink.createMany({
      data: links.map((link, index) => ({
        creatorProfileId: profile.id,
        label: link.label,
        url: link.url,
        sortOrder: index,
      })),
    });
  }

  revalidatePath("/creator/profile");
  revalidatePath(`/creators/${profile.id}`);
  return { success: true };
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      socialLinks: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!profile) {
    return [];
  }

  return profile.socialLinks.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
  }));
}

export async function deleteSocialLink(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Creator profile not found");
  }

  await db.creatorSocialLink.deleteMany({
    where: {
      id,
      creatorProfileId: profile.id,
    },
  });

  revalidatePath("/creator/profile");
}
