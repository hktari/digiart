"use client";

import { motion } from "framer-motion";

interface VignetteOverlayProps {
  className?: string;
}

export function VignetteOverlay({ className = "" }: VignetteOverlayProps) {
  return (
    <motion.div
      className={`fixed inset-0 pointer-events-none z-10 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100/20 via-transparent to-ocean-100/10" />

      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-100/30 to-transparent rounded-full blur-xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-fuchsia-100/20 to-transparent rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-jade-100/20 to-transparent rounded-full blur-xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-ocean-100/20 to-transparent rounded-full blur-xl" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-gray-50/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/20 via-transparent to-transparent" />
    </motion.div>
  );
}
