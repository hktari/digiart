import clsx from "clsx";

interface BadgeProps {
  variant: "hot" | "contacted" | "irrelevant" | "score";
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
        {
          "bg-twitter-hot/10 text-twitter-hot": variant === "hot",
          "bg-twitter-success/10 text-twitter-success": variant === "contacted",
          "bg-twitter-danger/10 text-twitter-danger": variant === "irrelevant",
          "bg-twitter-primary/10 text-twitter-primary": variant === "score",
        },
      )}
    >
      {children}
    </span>
  );
}
