import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, predictions, matches } from "@/db/schema";
import { eq, and, isNotNull, asc } from "drizzle-orm";
import { STARTING_BANKROLL } from "@/lib/scoring";

function computeStreaks(
  sortedPredictions: { isCorrect: boolean | null }[]
): { currentStreak: number; bestStreak: number } {
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

  return { currentStreak: streak, bestStreak };
}

function computeInsights(
  predictionHistory: {
    predictedWinner: string;
    confidence: number;
    isCorrect: boolean | null;
    teamA: string;
    teamB: string;
    predictedTeamName: string;
  }[],
  allAgentPredictions: Map<string, { matchId: string; predictedWinner: string }[]>,
  agentId: string
): string[] {
  const insights: string[] = [];
  if (predictionHistory.length === 0) return insights;

  // Average confidence
  const avgConf =
    predictionHistory.reduce((s, p) => s + p.confidence, 0) /
    predictionHistory.length;
  if (avgConf > 0.8) {
    insights.push("Most confident predictor - averages above 80% confidence");
  } else if (avgConf < 0.65) {
    insights.push("Cautious predictor - tends to hedge with lower confidence");
  }

  // Team A bias (first-listed team tendency)
  const teamAPicks = predictionHistory.filter(
    (p) => p.predictedWinner === "team_a"
  ).length;
  const teamARate = teamAPicks / predictionHistory.length;
  if (teamARate > 0.65) {
    insights.push("Tends to favor the first-listed team");
  } else if (teamARate < 0.35) {
    insights.push("Tends to favor the second-listed team (underdog lean)");
  }

  // High confidence accuracy
  const highConf = predictionHistory.filter((p) => p.confidence >= 0.8);
  if (highConf.length >= 3) {
    const highConfCorrect = highConf.filter((p) => p.isCorrect).length;
    const highConfRate = highConfCorrect / highConf.length;
    if (highConfRate > 0.7) {
      insights.push("Highly accurate when confident (80%+ confidence bets)");
    } else if (highConfRate < 0.4) {
      insights.push("Overconfident - high confidence picks often miss");
    }
  }

  // Agreement with other agents
  const thisAgentPreds = allAgentPredictions.get(agentId) || [];
  const thisAgentByMatch = new Map(thisAgentPreds.map((p) => [p.matchId, p.predictedWinner]));

  let maxAgree = 0;
  let maxAgreeAgent = "";
  let minAgree = Infinity;
  let minAgreeAgent = "";

  for (const [otherId, otherPreds] of allAgentPredictions) {
    if (otherId === agentId) continue;
    let agree = 0;
    let total = 0;
    for (const op of otherPreds) {
      const thisPick = thisAgentByMatch.get(op.matchId);
      if (thisPick !== undefined) {
        total++;
        if (thisPick === op.predictedWinner) agree++;
      }
    }
    if (total >= 3) {
      const rate = agree / total;
      if (rate > maxAgree) {
        maxAgree = rate;
        maxAgreeAgent = otherId;
      }
      if (rate < minAgree) {
        minAgree = rate;
        minAgreeAgent = otherId;
      }
    }
  }

  if (maxAgreeAgent && maxAgree > 0.7) {
    insights.push(`Often agrees with ${maxAgreeAgent}`);
  }
  if (minAgreeAgent && minAgree < 0.3) {
    insights.push(`Frequently disagrees with ${minAgreeAgent}`);
  }

  return insights;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.slug, slug))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentData = agent[0];

    // All scored predictions for this agent (for stats)
    const scoredPredictions = await db
      .select({
        id: predictions.id,
        matchId: predictions.matchId,
        predictedWinner: predictions.predictedWinner,
        predictedTeamName: predictions.predictedTeamName,
        confidence: predictions.confidence,
        reasoning: predictions.reasoning,
        predictionWindow: predictions.predictionWindow,
        isCorrect: predictions.isCorrect,
        pointsAwarded: predictions.pointsAwarded,
        pnl: predictions.pnl,
        brierScore: predictions.brierScore,
        createdAt: predictions.createdAt,
        matchNumber: matches.matchNumber,
        stage: matches.stage,
        teamA: matches.teamA,
        teamB: matches.teamB,
        venue: matches.venue,
        scheduledAt: matches.scheduledAt,
        matchStatus: matches.status,
        winnerTeamName: matches.winnerTeamName,
      })
      .from(predictions)
      .innerJoin(matches, eq(predictions.matchId, matches.id))
      .where(
        and(
          eq(predictions.agentId, agentData.id),
          eq(predictions.isLatest, true)
        )
      )
      .orderBy(asc(matches.scheduledAt));

    // Compute stats from scored-only predictions
    const scored = scoredPredictions.filter((p) => p.isCorrect !== null);
    const totalPredictions = scored.length;
    const correctCount = scored.filter((p) => p.isCorrect).length;
    const accuracy =
      totalPredictions > 0
        ? Math.round((correctCount / totalPredictions) * 10000) / 100
        : 0;
    const totalPnl = scored.reduce((s, p) => s + (p.pnl || 0), 0);
    const totalPoints = scored.reduce(
      (s, p) => s + (p.pointsAwarded || 0),
      0
    );
    const brierSum = scored.reduce((s, p) => s + (p.brierScore || 0), 0);
    const brierAvg =
      totalPredictions > 0
        ? Math.round((brierSum / totalPredictions) * 10000) / 10000
        : 0;
    const { currentStreak, bestStreak } = computeStreaks(scored);

    // Head-to-head: get all latest predictions from all agents
    const allLatest = await db
      .select({
        agentId: predictions.agentId,
        matchId: predictions.matchId,
        predictedWinner: predictions.predictedWinner,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.isLatest, true),
          isNotNull(predictions.isCorrect)
        )
      );

    const predsByAgent = new Map<
      string,
      { matchId: string; predictedWinner: string }[]
    >();
    for (const p of allLatest) {
      const existing = predsByAgent.get(p.agentId) || [];
      existing.push({ matchId: p.matchId, predictedWinner: p.predictedWinner });
      predsByAgent.set(p.agentId, existing);
    }

    // Compute head-to-head agreement percentages
    const thisAgentPreds = predsByAgent.get(agentData.id) || [];
    const thisByMatch = new Map(
      thisAgentPreds.map((p) => [p.matchId, p.predictedWinner])
    );

    const allAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true));

    const headToHead: Record<string, { agreed: number; total: number; agreementPct: number }> = {};

    for (const other of allAgents) {
      if (other.id === agentData.id) continue;
      const otherPreds = predsByAgent.get(other.id) || [];
      let agreed = 0;
      let total = 0;
      for (const op of otherPreds) {
        const thisPick = thisByMatch.get(op.matchId);
        if (thisPick !== undefined) {
          total++;
          if (thisPick === op.predictedWinner) agreed++;
        }
      }
      headToHead[other.slug] = {
        agreed,
        total,
        agreementPct:
          total > 0 ? Math.round((agreed / total) * 10000) / 100 : 0,
      };
    }

    // Personality insights
    const insightsInput = scoredPredictions
      .filter((p) => p.isCorrect !== null)
      .map((p) => ({
        predictedWinner: p.predictedWinner,
        confidence: p.confidence,
        isCorrect: p.isCorrect,
        teamA: p.teamA,
        teamB: p.teamB,
        predictedTeamName: p.predictedTeamName,
      }));

    const insights = computeInsights(insightsInput, predsByAgent, agentData.id);

    return NextResponse.json({
      ...agentData,
      stats: {
        totalPoints,
        totalPnl: Math.round(totalPnl * 100) / 100,
        bankroll: Math.round((STARTING_BANKROLL + totalPnl) * 100) / 100,
        brierAvg,
        accuracy,
        currentStreak,
        bestStreak,
        totalPredictions,
        correctCount,
      },
      predictionHistory: scoredPredictions,
      headToHead,
      insights,
    });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent details" },
      { status: 500 }
    );
  }
}
