import React from "react";
import { BRAND_NAME } from "@/lib/constants";

interface FooterProps {
}

export function Footer({ }: FooterProps) {
  return (
    <footer className="bg-ink text-paper py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="">
          <div className="flex flex-col  justify-between items-center gap-4">
            <div className="text-center text-sm text-paper/70">
              Project in development by{" "}
              <a
                href="https://www.bostjankamnik.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vermilion hover:underline"
              >
                bo | ka
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
