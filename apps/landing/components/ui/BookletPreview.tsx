"use client";

import React from "react";
import { motion } from "framer-motion";

interface BookletPreviewProps {
  title: string;
  subtitle: string;
  style: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  width?: number;
}

export function BookletPreview({
  title,
  subtitle,
  style,
  palette,
  width = 280,
}: BookletPreviewProps) {
  const getStyleClass = () => {
    switch (style) {
      case "minimal":
        return "bg-gradient-to-b from-white to-gray-50";
      case "bold":
        return "bg-gradient-to-br";
      case "elegant":
        return "bg-gradient-to-b";
      default:
        return "bg-gradient-to-b from-white to-gray-50";
    }
  };

  return (
    <div className="inline-block w-fit" style={{ perspective: 900 }}>
      <motion.div
        key={`${style}-${palette.primary}-${palette.secondary}-${palette.accent}`}
        className="aspect-[49/60] w-fit relative"
        style={{
          transformStyle: "preserve-3d",
          minWidth: width,
          containerType: "inline-size",
        }}
        initial={{ rotateY: -5 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="flex flex-col h-full rounded-l-md rounded-r overflow-hidden shadow-2xl relative"
          style={{ width }}
        >
          {/* Top stripe/header */}
          <div
            className={`w-full h-1/3 relative overflow-hidden ${getStyleClass()}`}
            style={{
              background:
                style === "bold"
                  ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
                  : `linear-gradient(to bottom, ${palette.primary}, ${palette.secondary})`,
            }}
          >
            <div
              className="absolute h-full w-[8.2%] opacity-30 mix-blend-overlay"
              style={{
                background: "linear-gradient(90deg, #000 0%, transparent 100%)",
              }}
            />
          </div>

          {/* Main content area */}
          <div
            className="relative flex-1 bg-paper"
            style={{
              background:
                style === "minimal"
                  ? "#FAFAFA"
                  : style === "elegant"
                    ? `linear-gradient(to bottom, ${palette.secondary}15, #FAFAFA)`
                    : "#FAFAFA",
            }}
          >
            <div
              className="absolute h-full w-[8.2%] opacity-10"
              style={{
                background: "linear-gradient(90deg, #000 0%, transparent 100%)",
              }}
            />
            <div className="flex flex-col w-full h-full p-[6.1%] pl-[14.3%] justify-between">
              <div className="space-y-2">
                <motion.h3
                  className="text-[10.5cqw] leading-[1.1] tracking-tight font-semibold text-balance font-display"
                  style={{ color: palette.primary }}
                  key={title}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {title || "Your Booklet"}
                </motion.h3>
                <motion.p
                  className="text-[4.5cqw] leading-[1.3] opacity-70 font-body"
                  style={{ color: palette.primary }}
                  key={subtitle}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {subtitle || "Monthly Edition"}
                </motion.p>
              </div>

              {/* Decorative element based on style */}
              <div className="flex items-end justify-between">
                {style === "bold" && (
                  <svg className="w-6 h-6" style={{ fill: palette.accent }}>
                    <path d="M21,21H3L12,3Z" />
                  </svg>
                )}
                {style === "elegant" && (
                  <div className="flex gap-1">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ background: palette.accent }}
                    />
                    <div
                      className="w-1 h-6 rounded-full opacity-60"
                      style={{ background: palette.accent }}
                    />
                    <div
                      className="w-1 h-4 rounded-full opacity-30"
                      style={{ background: palette.accent }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Border overlay */}
          <div className="absolute inset-0 border border-ink/10 rounded-l-md rounded-r pointer-events-none" />
        </div>

        {/* 3D spine effect */}
        <div
          className="h-[calc(100%_-_2_*_3px)] w-[calc(29cqw_-_2px)] absolute top-[3px]"
          style={{
            background:
              "linear-gradient(90deg, #e8e8e8, transparent 70%), linear-gradient(#fff, #f5f5f5)",
            transform: `translateX(calc(${width} * 1px - 29cqw / 2 - 3px)) rotateY(90deg) translateX(calc(29cqw / 2))`,
          }}
        />

        {/* Back cover */}
        <div
          className="absolute left-0 top-0 rounded-l-md rounded-r h-full"
          style={{
            width,
            transform: "translateZ(calc(-1 * 29cqw))",
            background: "#e0e0e0",
          }}
        />
      </motion.div>
    </div>
  );
}
