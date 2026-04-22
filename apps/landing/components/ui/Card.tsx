import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  const hoverStyles = hover
    ? "hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    : "";

  return (
    <div
      className={`bg-paper border border-ink/10 p-6 ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
}
