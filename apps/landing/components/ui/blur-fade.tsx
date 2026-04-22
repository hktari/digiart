"use client";

import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  UseInViewOptions,
  Variants,
} from "framer-motion";

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: MarginType;
  once?: boolean;
  blur?: string;
  as?: "div" | "span";
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.8,
  delay = 0,
  yOffset = 8,
  inView = true,
  inViewMargin = "-50px",
  once = false,
  blur = "8px",
  as = "div",
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  };
  const combinedVariants = variant || defaultVariants;
  const MotionComponent = motion[as];

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={combinedVariants}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}
