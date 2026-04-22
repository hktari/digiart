"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function ScrollArrowIndicator() {
  const { scrollYProgress } = useScroll();
  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsVisible(latest < 0.95);
    setHasScrolled(latest > 0.1);
  });

  if (!isVisible) return null;

  return (
    <motion.div
      className={`z-20 fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 p-3 ${
        hasScrolled ? "" : "md:bg-paper/80 rounded-md border-t border-ink/5 "
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, delay: 0 }}
    >
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        <ChevronDown
          className="w-10 h-10 md:w-16 md:h-16 text-ink/80"
          strokeWidth={2}
        />
      </motion.div>
      <motion.span
        className="text-lg text-ink/60"
        animate={{ opacity: [0.6, 0.8, 0.6] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        Scroll to explore
      </motion.span>
    </motion.div>
  );
}
