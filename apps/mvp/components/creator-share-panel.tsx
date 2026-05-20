"use client";

import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ReferralStats } from "@/lib/actions/creator";

const LAUNCH_BLURBS = [
  {
    channel: "Short bio or story",
    text: (url: string) =>
      `I'm testing a new way to turn my digital art into printed booklet releases. If you want to follow the first drop and help shape the pilot, you can subscribe here: ${url}`,
  },
  {
    channel: "Post caption",
    text: (url: string) =>
      `I'm trying something new: a curated print booklet release built from my digital art. The platform handles printing and delivery, and I'm using this first run to learn what collectors want. Follow the release here: ${url}`,
  },
  {
    channel: "Discord or newsletter",
    text: (url: string) =>
      `I'm part of an early pilot for a platform that turns digital art releases into printed booklets for subscribers. I uploaded my first release and would love feedback from people who already follow my work. You can view it here: ${url}`,
  },
];

interface CreatorSharePanelProps {
  referral: ReferralStats;
}

export function CreatorSharePanel({ referral }: CreatorSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [copiedBlurb, setCopiedBlurb] = useState<number | null>(null);

  async function copyLink() {
    await navigator.clipboard.writeText(referral.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyBlurb(index: number, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedBlurb(index);
    setTimeout(() => setCopiedBlurb(null), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Promote & track
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Promotion tools
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-lg">
          Share your profile link, track profile views from your campaigns, and
          see how your promotion efforts convert into subscribers.
        </p>
      </div>

      {/* Traffic stats */}
      <div className="rounded-xl border border-border bg-background p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Profile traffic
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {referral.profileViews.last7Days}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {referral.profileViews.last30Days}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {referral.profileViews.thisCycle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This cycle</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {referral.profileViews.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {referral.profileViews.total === 0 && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            No profile views yet. Share your link below to start driving
            traffic.
          </p>
        )}

        {referral.profileViews.total > 0 && referral.totalSignups > 0 && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <TrendingUp className="h-3.5 w-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {Math.round(
                  (referral.totalSignups / referral.profileViews.total) * 100,
                )}
                %
              </span>{" "}
              of profile visitors subscribed
            </p>
          </div>
        )}
      </div>

      {/* Referral link card */}
      <div className="rounded-xl border border-border bg-background p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Your share link
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted px-4 py-2.5">
            <p className="text-sm font-mono text-foreground truncate">
              {referral.shareUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
        </div>

        <a
          href={referral.shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Preview your public page
        </a>
      </div>

      {/* Signups counter */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-50 dark:bg-fuchsia-950">
            <Users className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">
              {referral.totalSignups}
            </p>
            <p className="text-sm text-muted-foreground">
              {referral.totalSignups === 1
                ? "subscriber via your link"
                : "subscribers via your link"}
            </p>
          </div>
        </div>
        {referral.totalSignups === 0 && (
          <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-4">
            No subscribers yet. Share your link to get started — even one post
            in the right channel can bring your first collector.
          </p>
        )}
      </div>

      {/* Launch blurbs */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Ready-to-paste copy
          </h2>
          <p className="text-xs text-muted-foreground">
            Pick one, copy it, and post wherever your audience is. Your link is
            already included.
          </p>
        </div>

        <div className="space-y-3">
          {LAUNCH_BLURBS.map((blurb, i) => {
            const text = blurb.text(referral.shareUrl);
            return (
              <div
                key={blurb.channel}
                className="rounded-xl border border-border bg-background p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {blurb.channel}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyBlurb(i, text)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    {copiedBlurb === i ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-jade-600 dark:text-jade-400" />
                        <span className="text-jade-600 dark:text-jade-400">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Tips for driving views
          </p>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            Add your link to your Instagram / Threads / DeviantArt / Civitai
            profile
          </li>
          <li>
            Post a story inviting people to view your art in printed format
          </li>
          <li>Share in your Discord server or community</li>
          <li>Publish an exclusive art release via DigiArt</li>
          <li>Add to your ArtStation / portfolio description</li>
        </ul>
      </div>
    </div>
  );
}
