import type { LeaderboardEntry } from "@/lib/api";
import { formatPnl, formatStreak, sortByRank } from "@/lib/utils";

interface NarrativeHeadline {
  headline: string;
  subline: string;
}

const PRE_TOURNAMENT: NarrativeHeadline = {
  headline: "The battle begins soon",
  subline: "4 AI models. Every T20 World Cup match. Who predicts best?",
};

export function generateNarrativeHeadline(
  entries: LeaderboardEntry[]
): NarrativeHeadline {
  if (entries.length === 0 || entries.every((e) => e.totalPredictions === 0)) {
    return PRE_TOURNAMENT;
  }

  const sorted = sortByRank(entries);
  const leader = sorted[0];

  if (sorted.length < 2) {
    return {
      headline: `${leader.displayName} leads with ${leader.points} correct pick${leader.points !== 1 ? "s" : ""}`,
      subline: "The battle is just getting started",
    };
  }

  const second = sorted[1];
  const last = sorted[sorted.length - 1];
  const pointSpread = leader.points - last.points;

  // All within 1 point
  if (pointSpread <= 1 && sorted.length > 2) {
    const subline =
      leader.totalPnl !== second.totalPnl
        ? `${leader.displayName} edges ahead on P&L (${formatPnl(leader.totalPnl)})`
        : `${leader.totalPredictions} predictions settled so far`;
    return {
      headline: "Anyone\u2019s game \u2014 all agents within 1 point",
      subline,
    };
  }

  // Tied at the top
  if (leader.points === second.points) {
    const pnlGap = Math.round(leader.totalPnl - second.totalPnl);
    const subline =
      leader.totalPnl > second.totalPnl
        ? `P&L breaks the tie \u2014 ${leader.displayName} leads by $${pnlGap}`
        : `${sorted.length > 2 ? sorted[2].displayName : "Others"} close behind`;
    return {
      headline: `Neck and neck \u2014 ${leader.displayName} and ${second.displayName} tied at ${leader.points}`,
      subline,
    };
  }

  // Clear leader
  const gap = leader.points - second.points;
  let subline = `${second.displayName} trails by ${gap} point${gap > 1 ? "s" : ""}`;

  const bestStreaker = sorted.reduce((best, e) =>
    e.currentStreak > best.currentStreak ? e : best
  );
  if (bestStreaker.currentStreak >= 4) {
    subline += ` \u00b7 ${bestStreaker.displayName} on a ${formatStreak(bestStreaker.currentStreak)} streak`;
  }

  return {
    headline: `${leader.displayName} leads with ${leader.points} correct pick${leader.points !== 1 ? "s" : ""}`,
    subline,
  };
}
