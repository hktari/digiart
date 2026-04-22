"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Users, Plus, Check } from "lucide-react";
import { PlatformIcon } from "./icons/PlatformIcon";
import { Button } from "./ui/Button";

interface Artist {
  id: string;
  name: string;
  platform: string;
  style: string;
  followers: string;
  avatar: string;
  bio: string;
  artworks?: string[];
}

interface SimilarArtistsProps {
  artists: Artist[];
  onArtistClick?: (artistId: string) => void;
  favoriteArtists?: string[];
}

export function SimilarArtists({
  artists,
  onArtistClick,
  favoriteArtists = [],
}: SimilarArtistsProps) {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(
    artists[0]?.id ?? null,
  );

  const handleArtistClick = (artistId: string) => {
    setSelectedArtistId(selectedArtistId === artistId ? null : artistId);
  };

  const selectedArtist = artists.find((a) => a.id === selectedArtistId);

  return (
    <section className="py-16 md:py-24 bg-paper-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4">
            Explore Similar Creators
          </h2>
          <p className="text-lg text-ink/60 font-body max-w-2xl mx-auto">
            Discover more creators with styles you'll love
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {artists.map((artist, index) => {
            const isSelected = selectedArtistId === artist.id;
            const isSubscribed = favoriteArtists.includes(artist.id);

            return (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ${isSelected
                  ? "ring-2 ring-vermilion ring-offset-2 ring-offset-paper-dark scale-[1.02]"
                  : "hover:scale-[1.02]"
                  }`}
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="bg-paper h-full flex flex-col">
                  {/* Artist Header - Minimal Profile Pic & Username */}
                  <div className="p-3 md:p-4 flex items-center gap-3 border-b border-ink/5">
                    <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0 bg-paper-dark">
                      <Image
                        src={artist.avatar}
                        alt={artist.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full opacity-80 mix-blend-luminosity"
                        sizes="48px"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm md:text-base font-semibold text-ink truncate group-hover:text-vermilion transition-colors">
                        @{artist.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <PlatformIcon
                          platform={artist.platform}
                          className="w-3 h-3 text-ink/50"
                        />
                        <span className="text-xs text-ink/50 truncate font-body">
                          {artist.style}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Action */}
                  <div className="p-3 md:p-4 mt-auto space-y-3 md:space-y-4 bg-paper/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-vermilion" />
                        <span className="font-display font-bold text-lg md:text-xl text-ink">
                          {artist.followers}
                        </span>
                      </div>
                      <span className="text-xs text-ink/50 uppercase tracking-wider font-semibold">
                        Subscribers
                      </span>
                    </div>

                    <Button
                      variant={isSubscribed ? "secondary" : "primary"}
                      className="w-full text-sm py-2 h-auto flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArtistClick?.(artist.id);
                      }}
                    >
                      {isSubscribed ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Subscribed
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Artwork Showcase Expandable Section */}
        <AnimatePresence mode="wait">
          {selectedArtist && selectedArtist.artworks && (
            <motion.div
              key={selectedArtist.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-paper rounded-xl p-6 md:p-8 border border-ink/10 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-ink">
                      Recent Generations by @{selectedArtist.name}
                    </h3>
                    <p className="text-ink/60 font-body mt-1">
                      {selectedArtist.bio}
                    </p>
                  </div>
                  <Button
                    variant={
                      favoriteArtists.includes(selectedArtist.id)
                        ? "secondary"
                        : "primary"
                    }
                    onClick={() => onArtistClick?.(selectedArtist.id)}
                    className="shrink-0"
                  >
                    {favoriteArtists.includes(selectedArtist.id)
                      ? "Subscribed"
                      : "Subscribe to Drop"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {selectedArtist.artworks.map((artwork, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="relative aspect-[4/5] rounded-lg overflow-hidden bg-paper-dark"
                    >
                      <Image
                        src={artwork}
                        alt={`${selectedArtist.name} artwork ${idx + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
