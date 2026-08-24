import type { MetadataRoute } from "next";
import { getIndexableSlugs } from "@/src/features/books/queries";
import { SITE_URL } from "@/src/lib/constants";

/**
 * Synthetic book URLs are excluded. `getIndexableSlugs` filters through
 * `isSynthetic`, so a future non-real source is dropped from the sitemap
 * automatically without editing this file.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getIndexableSlugs();

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/books/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
