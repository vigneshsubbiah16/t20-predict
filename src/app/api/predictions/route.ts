import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { predictions, agents, matches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );

    const recentPredictions = await db
      .select({
        id: predictions.id,
        matchId: predictions.matchId,
        agentId: predictions.agentId,
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
        agentDisplayName: agents.displayName,
        agentSlug: agents.slug,
        agentColor: agents.color,
        teamA: matches.teamA,
        teamB: matches.teamB,
        matchNumber: matches.matchNumber,
        matchStatus: matches.status,
        scheduledAt: matches.scheduledAt,
      })
      .from(predictions)
      .innerJoin(agents, eq(predictions.agentId, agents.id))
      .innerJoin(matches, eq(predictions.matchId, matches.id))
      .where(eq(predictions.isLatest, true))
      .orderBy(desc(predictions.createdAt))
      .limit(limit);

    return NextResponse.json(recentPredictions);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}
