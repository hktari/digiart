"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { BookletPreview } from "./ui/BookletPreview";
import { BOOKLET_STYLES, PALETTE_KITS, BOOKLET_FORMATS } from "@/lib/constants";

interface BookletCustomizerProps {
  onComplete?: (config: BookletConfig) => void;
}

export interface BookletConfig {
  style: string;
  paletteId: string;
  format: string;
}

export function BookletCustomizer({ onComplete }: BookletCustomizerProps) {
  const [config, setConfig] = useState<BookletConfig>({
    style: "bold",
    paletteId: "ocean",
    format: "magazine",
  });

  const currentStyle =
    BOOKLET_STYLES.find((s) => s.id === config.style) || BOOKLET_STYLES[0];
  const availablePalettes = PALETTE_KITS.filter((p) =>
    currentStyle.palettes.includes(p.id),
  );

  const selectedPalette =
    availablePalettes.find((p) => p.id === config.paletteId) ||
    availablePalettes[0];

  const updateConfig = (updates: Partial<BookletConfig>) => {
    const nextConfig = { ...config, ...updates };

    // If style changed, ensure palette is valid for new style
    if (updates.style && updates.style !== config.style) {
      const nextStyle = BOOKLET_STYLES.find((s) => s.id === updates.style);
      if (nextStyle && !nextStyle.palettes.includes(nextConfig.paletteId)) {
        nextConfig.paletteId = nextStyle.palettes[0];
      }
    }

    setConfig(nextConfig);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Preview */}
        <div className="flex justify-center lg:justify-end order-2 lg:order-1">
          <div className="animate-scale-in relative group">
            <div className="relative w-[320px] aspect-[3/4] rounded-lg overflow-hidden shadow-2xl transition-smooth group-hover:shadow-vermilion/20 border border-ink/5">
              <Image
                src={`/booklet-customizer/booklet-${config.style}-${config.paletteId}.png`}
                alt={`${config.style} style in ${config.paletteId} palette`}
                fill
                sizes="320px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-8 order-1 lg:order-2">
          <div className="space-y-2">
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-ink">
              Customize Your Booklet
            </h3>
            <p className="text-ink/60 font-body">
              Personalize the look and feel of your monthly collection
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink/80 font-body">
              Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {BOOKLET_FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => updateConfig({ format: format.id })}
                  disabled={format.id !== "magazine"}
                  className={`p-4 border-2 transition-smooth text-left ${
                    config.format === format.id
                      ? "border-vermilion bg-vermilion/5"
                      : format.id === "magazine"
                        ? "border-ink/10 hover:border-ink/20"
                        : "border-ink/5 bg-ink/5 cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="font-medium text-sm font-body">
                    {format.name}
                  </div>
                  <div className="text-xs text-ink/50 mt-1 font-body">
                    {format.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink/80 font-body">
              Style
            </label>
            <div className="grid grid-cols-3 gap-3">
              {BOOKLET_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateConfig({ style: style.id })}
                  className={`p-4 border-2 transition-smooth text-left ${
                    config.style === style.id
                      ? "border-vermilion bg-vermilion/5"
                      : "border-ink/10 hover:border-ink/20"
                  }`}
                >
                  <div className="font-medium text-sm font-body">
                    {style.name}
                  </div>
                  <div className="text-xs text-ink/50 mt-1 font-body">
                    {style.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Palette Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink/80 font-body">
              Color Palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availablePalettes.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => updateConfig({ paletteId: palette.id })}
                  className={`p-4 border-2 transition-smooth ${
                    config.paletteId === palette.id
                      ? "border-vermilion bg-vermilion/5"
                      : "border-ink/10 hover:border-ink/20"
                  }`}
                >
                  <div className="flex gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ background: palette.colors.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ background: palette.colors.secondary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ background: palette.colors.accent }}
                    />
                  </div>
                  <div className="font-medium text-sm font-body">
                    {palette.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
