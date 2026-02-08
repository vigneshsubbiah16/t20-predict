import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { predictions, agents } from "@/db/schema";
import { eq, and, isNotNull, asc } from "drizzle-orm";
import { STARTING_BANKROLL } from "@/lib/scoring";

interface AgentLeaderboardEntry {
  agentId: string;
  displayName: string;
  slug: string;
  color: string;
  provider: string;
  totalPredictions: number;
  correctCount: number;
  winRate: number;
  totalPnl: number;
  avgBrier: number;
  currentStreak: number;
  bestStreak: number;
  bankroll: number;
  totalPoints: number;
}

function computeStreaks(
  sortedPredictions: { isCorrect: boolean | null; createdAt: string }[]
): { currentStreak: number; bestStreak: number } {
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;

  for (const p of sortedPredictions) {
    if (p.isCorrect) {
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }
  currentStreak = streak;

  return { currentStreak, bestStreak };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "points";

    const VALID_SORTS = ["points", "brier", "pnl"];
    if (!VALID_SORTS.includes(sort)) {
      return NextResponse.json({ error: "Invalid sort parameter" }, { status: 400 });
    }

    const allAgents = await db.select().from(agents).where(eq(agents.isActive, true));

    const scoredPredictions = await db
      .select({
        id: predictions.id,
        agentId: predictions.agentId,
        isCorrect: predictions.isCorrect,
        pointsAwarded: predictions.pointsAwarded,
        pnl: predictions.pnl,
        brierScore: predictions.brierScore,
        createdAt: predictions.createdAt,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.isLatest, true),
          isNotNull(predictions.isCorrect)
        )
      )
      .orderBy(asc(predictions.createdAt));

    const predictionsByAgent = new Map<string, typeof scoredPredictions>();
    for (const p of scoredPredictions) {
      const existing = predictionsByAgent.get(p.agentId) || [];
      existing.push(p);
      predictionsByAgent.set(p.agentId, existing);
    }

    const leaderboard: AgentLeaderboardEntry[] = allAgents.map((agent) => {
      const agentPreds = predictionsByAgent.get(agent.id) || [];
      const totalPredictions = agentPreds.length;
      const correctCount = agentPreds.filter((p) => p.isCorrect).length;
      const winRate =
        totalPredictions > 0
          ? Math.round((correctCount / totalPredictions) * 10000) / 100
          : 0;
      const totalPnl = agentPreds.reduce((sum, p) => sum + (p.pnl || 0), 0);
      const totalPoints = agentPreds.reduce(
        (sum, p) => sum + (p.pointsAwarded || 0),
        0
      );
      const brierSum = agentPreds.reduce(
        (sum, p) => sum + (p.brierScore || 0),
        0
      );
      const avgBrier =
        totalPredictions > 0
          ? Math.round((brierSum / totalPredictions) * 10000) / 10000
          : 0;
      const { currentStreak, bestStreak } = computeStreaks(agentPreds);

      return {
        agentId: agent.id,
        displayName: agent.displayName,
        slug: agent.slug,
        color: agent.color,
        provider: agent.provider,
        totalPredictions,
        correctCount,
        winRate,
        totalPnl: Math.round(totalPnl * 100) / 100,
        avgBrier,
        currentStreak,
        bestStreak,
        bankroll: Math.round((STARTING_BANKROLL + totalPnl) * 100) / 100,
        totalPoints,
      };
    });

    if (sort === "brier") {
      leaderboard.sort((a, b) => a.avgBrier - b.avgBrier);
    } else if (sort === "pnl") {
      leaderboard.sort((a, b) => b.totalPnl - a.totalPnl);
    } else {
      leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error computing leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to compute leaderboard" },
      { status: 500 }
    );
  }
}
