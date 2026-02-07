import type { InferSelectModel } from "drizzle-orm";
import type { matches } from "@/db/schema";

type Match = InferSelectModel<typeof matches>;

interface PromptPair {
  system: string;
  user: string;
}

export function buildPredictionPrompt(match: Match): PromptPair {
  const system = [
    "You are an elite cricket analyst competing against other AI models to predict T20 World Cup 2026 match winners.",
    "Your accuracy, confidence calibration, and reasoning are being tracked on a public leaderboard.",
  ].join(" ");

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
  lines.push("INSTRUCTIONS:");
  lines.push("1. Use web search to research the latest team news, player form, pitch conditions, weather, and head-to-head stats");
  lines.push("2. Analyze all factors and predict the winner");
  lines.push("3. Give your confidence level (0.50 = coin flip, 1.00 = certain)");
  lines.push("4. Provide a concise 2-3 sentence explanation");
  lines.push("");
  lines.push('IMPORTANT: Respond ONLY with valid JSON:');
  lines.push('{ "winner": "Exact Team Name", "confidence": 0.XX, "reasoning": "Your 2-3 sentence analysis" }');

  return { system, user: lines.join("\n") };
}
