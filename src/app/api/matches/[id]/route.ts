import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchPredictions = await db
      .select({
        id: predictions.id,
        agentId: predictions.agentId,
        predictedWinner: predictions.predictedWinner,
        predictedTeamName: predictions.predictedTeamName,
        confidence: predictions.confidence,
        reasoning: predictions.reasoning,
        predictionWindow: predictions.predictionWindow,
        searchQueries: predictions.searchQueries,
        searchSummary: predictions.searchSummary,
        isCorrect: predictions.isCorrect,
        pointsAwarded: predictions.pointsAwarded,
        pnl: predictions.pnl,
        brierScore: predictions.brierScore,
        createdAt: predictions.createdAt,
        agentDisplayName: agents.displayName,
        agentSlug: agents.slug,
        agentColor: agents.color,
        agentProvider: agents.provider,
        agentModelId: agents.modelId,
      })
      .from(predictions)
      .innerJoin(agents, eq(predictions.agentId, agents.id))
      .where(
        and(eq(predictions.matchId, id), eq(predictions.isLatest, true))
      );

    return NextResponse.json({
      ...match[0],
      predictions: matchPredictions,
    });
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json(
      { error: "Failed to fetch match" },
      { status: 500 }
    );
  }
}
