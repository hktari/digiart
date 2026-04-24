import type { CycleStatus } from "@prisma/client";

interface CycleLockedBannerProps {
  status: CycleStatus;
  cycleName: string;
}

export function CycleLockedBanner({ status, cycleName }: CycleLockedBannerProps) {
  if (status === "OPEN") {
    return null;
  }

  const messages = {
    LOCKED: {
      title: "Cycle Locked",
      description: "Selections are locked while we prepare your booklet. No changes can be made at this time.",
      color: "yellow",
    },
    PROCESSING: {
      title: "Processing",
      description: "Your booklet is being generated. This cycle is now closed for editing.",
      color: "blue",
    },
    COMPLETE: {
      title: "Cycle Complete",
      description: "This cycle has been fulfilled. View your archived selections below.",
      color: "gray",
    },
  };

  const config = messages[status];
  const bgColor = `bg-${config.color}-50`;
  const borderColor = `border-${config.color}-200`;
  const textColor = `text-${config.color}-800`;
  const titleColor = `text-${config.color}-900`;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${textColor}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${titleColor}`}>
            {config.title}: {cycleName}
          </h3>
          <p className={`text-sm ${textColor} mt-1`}>{config.description}</p>
        </div>
      </div>
    </div>
  );
}
