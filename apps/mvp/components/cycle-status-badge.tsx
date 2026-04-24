import type { CycleStatus } from "@prisma/client";

interface CycleStatusBadgeProps {
  status: CycleStatus;
  className?: string;
}

export function CycleStatusBadge({ status, className = "" }: CycleStatusBadgeProps) {
  const colors = {
    OPEN: "bg-green-100 text-green-800",
    LOCKED: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETE: "bg-gray-100 text-gray-800",
  };

  const labels = {
    OPEN: "Open",
    LOCKED: "Locked",
    PROCESSING: "Processing",
    COMPLETE: "Complete",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
}
