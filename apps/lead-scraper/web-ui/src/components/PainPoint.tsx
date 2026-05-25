import clsx from "clsx";
import type { PainPoint as PainPointType } from "../types";

interface PainPointProps {
  painPoint: PainPointType;
}

export function PainPoint({ painPoint }: PainPointProps) {
  const severityColors = {
    high: "border-twitter-hot",
    medium: "border-twitter-warning",
    low: "border-twitter-success",
  };

  return (
    <div
      className={clsx(
        "bg-twitter-secondary p-3 rounded-lg border-l-4 mb-2 last:mb-0 transition-all hover:bg-twitter-hover",
        severityColors[painPoint.severity],
      )}
    >
      <div className="text-xs font-semibold text-twitter-primary uppercase mb-1">
        {painPoint.category}
      </div>
      <div className="text-sm text-twitter-text">{painPoint.description}</div>
    </div>
  );
}
