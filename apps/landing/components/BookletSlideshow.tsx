"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { SLIDESHOW_IMAGES } from "@/lib/constants";

interface BookletSlideshowProps {
  images?: string[];
}

export function BookletSlideshow({
  images = SLIDESHOW_IMAGES,
}: BookletSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, images.length]);

  return (
    <div
      className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-paper-dark"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
        >
          <Image
            src={src}
            alt={`Booklet showcase ${index + 1}`}
            fill
            className="object-contain"
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          />
        </div>
      ))}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? "bg-vermilion w-6" : "bg-ink/30"
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
