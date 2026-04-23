"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAllTags() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { releaseTags: true } },
    },
  });
}

export async function getOrCreateTags(tagNames: string[]) {
  const tags = await Promise.all(
    tagNames.map(async (name) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const slug = slugify(trimmedName);

      const existing = await db.tag.findUnique({
        where: { slug },
      });

      if (existing) return existing;

      return db.tag.create({
        data: { name: trimmedName, slug },
      });
    }),
  );

  return tags.filter((tag) => tag !== null);
}

export async function setReleaseTags(releaseId: string, tagNames: string[]) {
  const tags = await getOrCreateTags(tagNames);

  await db.$transaction([
    db.releaseTag.deleteMany({ where: { releaseId } }),
    db.releaseTag.createMany({
      data: tags.map((tag) => ({
        releaseId,
        tagId: tag.id,
      })),
    }),
  ]);

  revalidatePath("/creator/releases");
  revalidatePath(`/creator/releases/${releaseId}`);
  revalidatePath("/browse/releases");
}

export async function getReleaseTags(releaseId: string) {
  const releaseTags = await db.releaseTag.findMany({
    where: { releaseId },
    include: { tag: true },
  });

  return releaseTags.map((rt) => rt.tag);
}
