"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TagFilter } from "@/components/tag-filter";

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count: {
    releaseTags: number;
  };
}

interface Release {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  creatorProfile: {
    displayName: string;
    slug: string;
    avatar: string | null;
  };
  artworks: Array<{
    artwork: {
      id: string;
      title: string;
      thumbnailUrl: string;
    };
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  _count: {
    artworks: number;
  };
}

interface BrowseReleasesClientProps {
  initialTags: Tag[];
  initialReleases: Release[];
  initialSelectedTags: string[];
}

export function BrowseReleasesClient({
  initialTags,
  initialReleases,
  initialSelectedTags,
}: BrowseReleasesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTags, setSelectedTags] =
    useState<string[]>(initialSelectedTags);

  const handleTagToggle = (tagSlug: string) => {
    const newSelectedTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug];

    setSelectedTags(newSelectedTags);
    updateUrl(newSelectedTags);
  };

  const handleClearAll = () => {
    setSelectedTags([]);
    updateUrl([]);
  };

  const updateUrl = (tags: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (tags.length > 0) {
      params.set("tags", tags.join(","));
    } else {
      params.delete("tags");
    }
    router.push(`/browse/releases?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Browse Releases</h1>
        <p className="mt-2 text-neutral-600">
          Explore monthly releases from creators
        </p>
      </div>

      <TagFilter
        tags={initialTags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearAll={handleClearAll}
      />

      {initialReleases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-500">
            {selectedTags.length > 0
              ? "No releases found with the selected tags"
              : "No published releases yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialReleases.map((release) => (
            <Link
              key={release.id}
              href={`/creators/${release.creatorProfile.slug}/releases/${release.id}`}
              className="group block bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {release.artworks[0] && (
                <div className="aspect-4/3 relative bg-neutral-100">
                  <Image
                    src={release.artworks[0].artwork.thumbnailUrl}
                    alt={release.artworks[0].artwork.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-neutral-900 group-hover:text-fuchsia-600 transition-colors">
                    {release.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    by {release.creatorProfile.displayName}
                  </p>
                </div>

                {release.description && (
                  <p className="text-sm text-neutral-600 line-clamp-2">
                    {release.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{release._count.artworks} artworks</span>
                  <span>
                    {new Date(release.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {release.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {release.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
