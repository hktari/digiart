import type { MetadataRoute } from "next";

const BASE_URL = "https://app.digiart.btechhub.top";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/creators/"],
        disallow: [
          "/admin/",
          "/api/",
          "/collector/",
          "/creator/",
          "/dashboard/",
          "/onboarding/",
          "/notifications/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
