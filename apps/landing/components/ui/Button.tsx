import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "positive"
    | "ghost"
    | "tertiary"
    | "link";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "font-sans font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded";

  const variants = {
    primary: "bg-ocean-600 text-paper hover:bg-ocean-700 active:bg-ocean-800",
    secondary: "bg-jade-400 text-paper hover:bg-jade-500 active:bg-jade-600",
    tertiary:
      "bg-fuchsia-400 text-paper hover:bg-fuchsia-500 active:bg-fuchsia-600",
    positive: "bg-jade-400 text-paper hover:bg-jade-500 active:bg-jade-600",

    ghost:
      "bg-transparent text-ink border-2 border-ink hover:bg-ink hover:text-paper",
    link: "bg-transparent text-ocean-600 underline-offset-4 hover:underline",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
