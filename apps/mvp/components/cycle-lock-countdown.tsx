"use client";

import { useState, useEffect } from "react";
import { getTimeUntilLock } from "@/lib/cycle-utils";

interface CycleLockCountdownProps {
  lockDate: Date;
}

export function CycleLockCountdown({ lockDate }: CycleLockCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilLock(lockDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilLock(lockDate));
    }, 60000);

    return () => clearInterval(timer);
  }, [lockDate]);

  if (timeLeft.isExpired) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-900">
            Time until lock date
          </p>
          <p className="text-xs text-green-700 mt-1">
            Finalize your selections before the deadline
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-900">
            {timeLeft.days > 0 && `${timeLeft.days}d `}
            {timeLeft.hours}h {timeLeft.minutes}m
          </p>
          <p className="text-xs text-green-700 mt-1">
            {new Date(lockDate).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
