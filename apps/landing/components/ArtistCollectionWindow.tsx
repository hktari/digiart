"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  platform: string;
  style: string;
  followers: string;
  avatar: string;
  bio: string;
}

interface ArtistCollectionWindowProps {
  artists: Artist[];
  show?: boolean;
  onClose?: () => void;
  onArtistSelect?: (artistId: string) => void;
  favoriteArtists?: string[];
  onToggleFavorite?: (artistId: string) => void;
}

export function ArtistCollectionWindow({
  artists,
  show = true,
  onClose,
  onArtistSelect,
  favoriteArtists = [],
  onToggleFavorite,
}: ArtistCollectionWindowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev - 1 + artists.length) % artists.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % artists.length);
  };

  const handleArtistClick = (artist: Artist) => {
    setIsExpanded(true);
    onArtistSelect?.(artist.id);
  };

  const handleToggleFavorite = (artistId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite?.(artistId);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="bg-paper/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-ink/10 overflow-hidden"
            style={{ width: isExpanded ? "420px" : "360px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Creator Collection
                </h3>
                <p className="text-xs text-ink/50 font-body mt-0.5">
                  {artists.length} creators
                </p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-ink/5 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-ink/60" />
                </button>
              )}
            </div>

            {/* Main Card Stack */}
            <div className="relative h-80 overflow-hidden">
              <AnimatePresence>
                {artists.map((artist, index) => {
                  const offset = index - activeIndex;
                  const isActive = index === activeIndex;
                  const isVisible = Math.abs(offset) <= 2;

                  if (!isVisible) return null;

                  return (
                    <motion.div
                      key={artist.id}
                      className="absolute inset-0 p-5"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: isActive ? 1 : 0.3,
                        scale: isActive ? 1 : 0.95,
                        x: offset * 20,
                        y: Math.abs(offset) * 10,
                        zIndex: artists.length - Math.abs(offset),
                        filter: isActive ? "blur(0px)" : "blur(2px)",
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ pointerEvents: isActive ? "auto" : "none" }}
                    >
                      <div
                        className="h-full bg-paper-dark rounded-xl border border-ink/10 overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => handleArtistClick(artist)}
                      >
                        {/* Artist Avatar */}
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={artist.avatar}
                            alt={artist.name}
                            width={400}
                            height={300}
                            className="object-cover w-full h-full"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/20 to-transparent" />
                          <div className="absolute bottom-3 right-3 bg-paper/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium font-body">
                            {artist.platform}
                          </div>
                        </div>

                        {/* Artist Info */}
                        <div className="p-5 space-y-3">
                          <div>
                            <h4 className="font-display text-xl font-semibold text-ink mb-1">
                              {artist.name}
                            </h4>
                            <p className="text-sm text-ink/60 font-body">
                              {artist.style}
                            </p>
                          </div>

                          <p className="text-sm text-ink/70 font-body leading-relaxed line-clamp-2">
                            {artist.bio}
                          </p>

                          <div className="flex items-center justify-between pt-2">
                            <span className="flex items-center gap-1.5 text-sm text-ink/50 font-body">
                              <Heart className="w-3.5 h-3.5" />
                              {artist.followers}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) =>
                                  handleToggleFavorite(artist.id, e)
                                }
                                className={`flex items-center gap-1 text-sm font-medium font-body transition-colors hover:gap-2 ${
                                  favoriteArtists.includes(artist.id)
                                    ? "text-vermilion"
                                    : "text-ink/40 hover:text-ink/60"
                                }`}
                                aria-label={
                                  favoriteArtists.includes(artist.id)
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                                }
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 ${
                                    favoriteArtists.includes(artist.id)
                                      ? "fill-current"
                                      : ""
                                  }`}
                                />
                                {favoriteArtists.includes(artist.id)
                                  ? "Favorited"
                                  : "Favorite"}
                              </button>
                              <button className="flex items-center gap-1 text-sm text-vermilion font-medium font-body hover:gap-2 transition-all">
                                View Profile
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-ink/10">
              <button
                onClick={handlePrevious}
                className="w-9 h-9 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center transition-colors disabled:opacity-30"
                disabled={artists.length <= 1}
                aria-label="Previous creator"
              >
                <ChevronLeft className="w-4 h-4 text-ink" />
              </button>

              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {artists.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-6 bg-vermilion"
                        : "w-1.5 bg-ink/20 hover:bg-ink/30"
                    }`}
                    aria-label={`Go to creator ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center transition-colors disabled:opacity-30"
                disabled={artists.length <= 1}
                aria-label="Next creator"
              >
                <ChevronRight className="w-4 h-4 text-ink" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
