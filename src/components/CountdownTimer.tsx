"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: string;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      setTimeLeft(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Avoid hydration mismatch by not rendering until client-side
  if (timeLeft === null) {
    return (
      <div className="text-3xl font-black font-mono text-primary">--:--:--</div>
    );
  }

  if (timeLeft <= 0) {
    return (
      <div className="text-3xl font-black font-mono text-red-600 animate-pulse">
        LIVE
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  // Urgency tiers
  const isUrgent = totalMinutes < 60;
  const isCritical = totalMinutes < 15;
  const isAlertWindow = totalHours < 24 && !isUrgent;

  const colorClass = isCritical
    ? "text-red-600"
    : isUrgent
    ? "text-orange-600"
    : "text-primary";

  const animationClass = isCritical
    ? "animate-countdown-urgent"
    : isUrgent
    ? "animate-countdown-urgent"
    : isAlertWindow
    ? "animate-countdown-tick"
    : "";

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return (
      <div className="text-3xl font-black font-mono text-primary">
        {days}d {remainingHours}h
      </div>
    );
  }

  return (
    <div className={cn("text-3xl font-black font-mono", colorClass, animationClass)}>
      {pad(totalHours)}:{pad(minutes)}:{pad(seconds)}
    </div>
  );
}
