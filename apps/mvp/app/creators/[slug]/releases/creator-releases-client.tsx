"use client";

import Image from "next/image";
import Link from "next/link";
import { InfiniteScrollSentinel } from "@/components/infinite-scroll-sentinel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

type Release = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  artworks: Array<{
    artwork: {
      id: string;
      title: string;
      thumbnailUrl: string;
    };
  }>;
  _count: {
    artworks: number;
  };
};

type CreatorProfile = {
  displayName: string;
  slug: string;
};

type CreatorReleasesClientProps = {
  initialReleases: Release[];
  profile: CreatorProfile;
  slug: string;
};

export function CreatorReleasesClient({
  initialReleases,
  profile,
  slug,
}: CreatorReleasesClientProps) {
  const { items, isLoading, isLoadingMore, hasMore, sentinelRef } =
    useInfiniteScroll<Release>({
      url: `/api/creators/${slug}/releases`,
      pageSize: 12,
      fallback: initialReleases,
    });

  return (
    <div className="bg-muted">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/browse">Browse</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/creators/${slug}`}>{profile.displayName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Releases</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold text-foreground">
            {profile.displayName}&apos;s releases
          </h1>
          <p className="text-muted-foreground">
            Browse complete releases and open one to inspect all included
            artworks.
          </p>
        </div>

        {items.length === 0 && !isLoading ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            No published releases yet.
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((release) => {
                const coverArtwork = release.artworks[0]?.artwork;

                return (
                  <Link
                    key={release.id}
                    href={`/creators/${slug}/releases/${release.id}`}
                    className="group overflow-hidden rounded-2xl border bg-card hover:border-fuchsia-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-4/3 bg-muted">
                      {coverArtwork && (
                        <Image
                          src={coverArtwork.thumbnailUrl}
                          alt={release.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <h2 className="font-semibold text-foreground group-hover:text-fuchsia-600">
                        {release.title}
                      </h2>
                      {release.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {release.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {release._count.artworks} artwork
                        {release._count.artworks === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <InfiniteScrollSentinel
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              hasItems={items.length > 0}
              sentinelRef={sentinelRef}
            />
          </>
        )}
      </div>
    </div>
  );
}
