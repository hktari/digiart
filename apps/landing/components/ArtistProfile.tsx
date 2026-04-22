"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, ExternalLink } from "lucide-react";
import { Button } from "./ui/Button";
import { PlatformIcon } from "./icons/PlatformIcon";

interface ArtistProfileProps {
  artist: {
    name: string;
    platform: string;
    style: string;
    followers: string;
    avatar: string;
    bio: string;
    id: string;
  };
  onSubscribe?: () => void;
  sampleArtwork?: string[];
}

export function ArtistProfile({
  artist,
  onSubscribe,
  sampleArtwork,
}: ArtistProfileProps) {
  // Generate default sample artwork paths based on artist ID if not provided
  const defaultArtwork = [
    `/artists/${artist.id}/art01.png`,
    `/artists/${artist.id}/art02.png`,
    `/artists/${artist.id}/art03.png`,
  ];
  return (
    <section className="py-16 md:py-24 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Artist Avatar */}
            <motion.div
              className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-ink/10 shadow-lg">
                <Image
                  src={artist.avatar}
                  alt={artist.name}
                  width={160}
                  height={160}
                  className="object-cover w-full h-full"
                  sizes="(max-width: 768px) 128px, 160px"
                  priority
                />
              </div>
            </motion.div>

            {/* Artist Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-2">
                  {artist.name}
                </h1>
                <div className="flex flex-wrap gap-3 text-sm text-ink/60 font-body">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{artist.style}</span>
                  </span>
                  <span className="text-ink/30">•</span>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span className="font-medium">
                      {artist.followers} subscribers
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-lg text-ink/70 leading-relaxed font-body max-w-2xl">
                {artist.bio}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={onSubscribe}
                  size="lg"
                  className="gap-2 flex items-center gap-1"
                >
                  <Heart className="w-4 h-4" />
                  Subscribe
                </Button>
                <a
                  href="#"
                  className="px-6 py-3 border-2 border-ink/10 hover:border-ink/20 transition-smooth flex items-center gap-2 font-medium font-body"
                  onClick={(e) => e.preventDefault()}
                >
                  <PlatformIcon size={20} platform={artist.platform} />
                </a>
              </div>
            </div>
          </div>

          {/* Sample Work Preview */}
          <motion.div
            className="mt-12 grid grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {defaultArtwork.map((artwork, index) => (
              <div
                key={index}
                className="aspect-square bg-paper-dark rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-smooth"
              >
                <Image
                  src={artwork}
                  alt={`Sample work ${index + 1}`}
                  width={400}
                  height={400}
                  className="object-cover w-full h-full hover:scale-105 transition-smooth"
                  sizes="(max-width: 768px) 33vw, 400px"
                  loading="lazy"
                />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
