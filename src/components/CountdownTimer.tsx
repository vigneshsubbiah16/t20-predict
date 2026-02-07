"use client";

import { useState, useEffect } from "react";

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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="text-3xl font-black font-mono text-primary">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </div>
  );
}
