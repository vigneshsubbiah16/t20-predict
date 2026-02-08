import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMatchLabel(stage: string, groupName?: string | null): string {
  switch (stage) {
    case "group":
      return groupName ? `Group ${groupName}` : "Group Stage";
    case "super8":
      return "Super 8";
    case "semi":
      return "Semi-Final";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

export function formatStreak(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "-";
}

export function formatPnl(pnl: number | null): string {
  if (pnl == null) return "-";
  const sign = pnl >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(pnl).toFixed(0)}`;
}

export function pnlColorClass(pnl: number | null): string {
  if (pnl == null) return "";
  return pnl >= 0 ? "text-emerald-600" : "text-red-600";
}

/**
 * Sort leaderboard entries by points (desc), then P&L as tiebreaker (desc).
 * Returns a new sorted array without mutating the input.
 */
export function sortByRank<T extends { points: number; totalPnl: number }>(
  entries: T[]
): T[] {
  return [...entries].sort(
    (a, b) => b.points - a.points || b.totalPnl - a.totalPnl
  );
}
