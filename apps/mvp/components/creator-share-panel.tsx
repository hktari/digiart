"use client";

import { Check, Copy, ExternalLink, Share2, Users } from "lucide-react";
import { useState } from "react";
import type { ReferralStats } from "@/lib/actions/creator";

const LAUNCH_BLURBS = [
  {
    channel: "Instagram / TikTok bio or story",
    text: (url: string) =>
      `I'm releasing new work as printed booklets — limited print runs, straight to your door. Subscribe here and you'll get my next one: {URL}`.replace(
        "{URL}",
        url,
      ),
  },
  {
    channel: "Post caption",
    text: (url: string) =>
      `New work, new format. I'm releasing prints as curated booklets — you can subscribe to mine here and get the next cycle delivered. Link: {URL}`.replace(
        "{URL}",
        url,
      ),
  },
  {
    channel: "Discord / Newsletter",
    text: (url: string) =>
      `Hey — I've joined an art subscription platform where I release curated print booklets each cycle. If you want the next one in your hands, subscribe here: {URL}\n\nNo algorithm. Just prints.`.replace(
        "{URL}",
        url,
      ),
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
            Share & grow
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your referral link
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-lg">
          Share this link in your bio, story, caption, or newsletter. Every
          subscription through it is tracked to you.
        </p>
      </div>

      {/* Referral link card */}
      <div className="rounded-xl border border-border bg-background p-6 space-y-4">
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
      <div className="rounded-xl border border-ocean-200 dark:border-ocean-800 bg-ocean-50 dark:bg-ocean-950/30 px-5 py-4">
        <p className="text-sm font-semibold text-ocean-800 dark:text-ocean-200 mb-1">
          Where to share
        </p>
        <ul className="text-sm text-ocean-700 dark:text-ocean-300 space-y-1 list-disc list-inside">
          <li>Instagram / TikTok bio link</li>
          <li>Story or post caption with link in bio</li>
          <li>Discord server announcement</li>
          <li>Newsletter or Substack</li>
          <li>ArtStation / DeviantArt profile description</li>
        </ul>
      </div>
    </div>
  );
}
