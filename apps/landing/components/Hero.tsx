"use client";

import React from "react";
import Image from "next/image";
import { Button } from "./ui/Button";

interface HeroProps {
  headline: string;
  subhead: string;
  cta: string;
  onCtaClick: () => void;
  images?: string[];
}

export function Hero({
  headline,
  subhead,
  cta,
  onCtaClick,
  images,
}: HeroProps) {
  return (
    <section className="relative h-[80vh] min-h-[600px] w-full overflow-hidden">
      {/* BentoGrid Background */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-[1fr_0.5fr_0.5fr_1fr] gap-2 md:gap-4 px-2 md:px-4">
        {images?.slice(0, 5).map((imageUrl, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl shadow-xl ${
              index === 0
                ? "col-span-8 md:col-span-6 row-span-3 origin-top-right"
                : index === 1
                  ? "col-span-2 row-span-2 hidden md:block"
                  : index === 2
                    ? "col-span-2 row-span-2 hidden md:block origin-bottom-right"
                    : index === 3
                      ? "col-span-4 md:col-span-3 origin-top-right"
                      : "col-span-4 md:col-span-3"
            }`}
          >
            <Image
              className="object-cover object-center"
              src={imageUrl}
              alt=""
              fill
              priority={index === 0}
              sizes={
                index === 0
                  ? "(max-width: 768px) 100vw, 75vw"
                  : "(max-width: 768px) 50vw, 25vw"
              }
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-paper/85 md:bg-paper/60 pointer-events-none" />

      {/* Centered Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-transparent px-4">
        <div className="relative z-10 text-center bg-paper/90 md:bg-paper/80 backdrop-blur-sm px-6 py-8 md:px-8 md:py-10 rounded-2xl shadow-lg max-w-2xl w-full">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semi text-ink leading-tight">
            {headline}
          </h1>
          <p className="my-4 md:my-6 text-sm text-ink/70 md:text-base">
            {subhead}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={onCtaClick}
              size="lg"
              className="px-4 py-2 font-medium w-full md:w-64"
            >
              {cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
