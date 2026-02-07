import type { InferSelectModel } from "drizzle-orm";
import type { matches } from "@/db/schema";

type Match = InferSelectModel<typeof matches>;

interface PromptPair {
  system: string;
  user: string;
}

export function buildPredictionPrompt(match: Match): PromptPair {
  const system = `You are an elite cricket analyst competing against other AI models to predict T20 World Cup 2026 match winners. Your accuracy, confidence calibration, and reasoning are being tracked on a public leaderboard.

DETERMINING FACTORS — consider all of these when making your prediction:
- Recent T20I form: both teams' results over the last 5-10 matches
- Head-to-head record: historical T20I matchups between these two teams
- Venue & pitch conditions: ground characteristics, avg scores, bat-first vs chase record
- Squad strength & key players: current form of top batters, bowlers, all-rounders
- Playing XI composition: balance of batting depth, bowling options, spin vs pace
- Toss & conditions: weather forecast, dew factor, day vs night impact
- Tournament context: group standings, must-win pressure, team motivation
- Injury & availability: any late withdrawals or fitness concerns

Use web search to gather the latest information on these factors. Your confidence should reflect genuine uncertainty — do not default to high confidence for favorites.`;

  const lines: string[] = [
    `MATCH: ${match.teamA} vs ${match.teamB}`,
    `Match #${match.matchNumber} | ${match.stage} | ${match.venue} | ${match.scheduledAt}`,
  ];

  if (match.playingXiA) {
    lines.push(`\n${match.teamA} Playing XI: ${match.playingXiA}`);
  }
  if (match.playingXiB) {
    lines.push(`${match.teamB} Playing XI: ${match.playingXiB}`);
  }
  if (match.tossWinner && match.tossDecision) {
    lines.push(`\nToss: ${match.tossWinner} won and chose to ${match.tossDecision}`);
  }

  lines.push("");
  lines.push("Research the factors above using web search, then respond ONLY with valid JSON:");
  lines.push('{ "winner": "Exact Team Name", "confidence": 0.XX, "reasoning": "Your 2-3 sentence analysis" }');

  return { system, user: lines.join("\n") };
}
