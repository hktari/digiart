"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/Button";

interface HeaderProps {
  activeTab: "creators" | "collectors";
  onCtaClick?: () => void;
  sticky?: boolean;
  showNavigation?: boolean;
}

export function Header({
  activeTab,
  onCtaClick,
  sticky = true,
  showNavigation = true,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`${sticky ? "sticky" : ""} top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-paper/95 backdrop-blur-sm shadow-md" : "bg-paper"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div
          className={`flex items-center h-16 md:h-20 ${showNavigation ? "justify-between " : "justify-start ms-8"}`}
        >
          <Link
            href="/"
            className="font-serif font-bold text-xl md:text-2xl text-ink hover:text-vermilion transition-colors"
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={256}
              height={256}
              className="h-24 w-auto"
              priority
            />
          </Link>

          {showNavigation && (
            <nav className="flex items-center gap-4 md:gap-8">
              <div className="flex gap-1 bg-paper-dark p-1 rounded">
                <Link href="/creators">
                  <button
                    className={`px-4 py-2 text-sm md:text-base font-medium transition-all ${
                      activeTab === "creators"
                        ? "bg-ocean-600 text-paper shadow-sm"
                        : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    For Creators
                  </button>
                </Link>
                <Link href="/collectors">
                  <button
                    className={`px-4 py-2 text-sm md:text-base font-medium transition-all ${
                      activeTab === "collectors"
                        ? "bg-fuchsia-600 text-paper shadow-sm"
                        : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    For Collectors
                  </button>
                </Link>
              </div>

              <Button
                variant={activeTab === "creators" ? "primary" : "tertiary"}
                onClick={onCtaClick}
                size="sm"
                className="hidden md:block text-paper"
              >
                Join Waitlist
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
