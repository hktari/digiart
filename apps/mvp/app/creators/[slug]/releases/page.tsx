import { notFound } from "next/navigation";
import {
  getPublicCreatorProfile,
  getPublicCreatorReleases,
} from "@/lib/actions/creator";
import { CreatorReleasesClient } from "./creator-releases-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CreatorReleasesPage({ params }: Props) {
  const { slug } = await params;
  const [profile, releases] = await Promise.all([
    getPublicCreatorProfile(slug),
    getPublicCreatorReleases(slug),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <CreatorReleasesClient
      initialReleases={releases}
      profile={{ displayName: profile.displayName, slug }}
      slug={slug}
    />
  );
}
