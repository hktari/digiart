import type { MetadataRoute } from "next";
import { getAllPublishedCreators } from "@/lib/actions/browse";

const BASE_URL = "https://app.digiart.btechhub.top";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const creators = await getAllPublishedCreators();

  const creatorUrls: MetadataRoute.Sitemap = creators.map((c) => ({
    url: `${BASE_URL}/creators/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/sign-in`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...creatorUrls,
  ];
}
