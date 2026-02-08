import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");

    const VALID_STATUSES = ["upcoming", "live", "completed", "abandoned"];
    const VALID_STAGES = ["group", "super8", "semi", "final"];

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status parameter" }, { status: 400 });
    }
    if (stage && !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage parameter" }, { status: 400 });
    }

    const conditions = [];
    if (status) conditions.push(eq(matches.status, status));
    if (stage) conditions.push(eq(matches.stage, stage));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const allMatches = await db
      .select({
        id: matches.id,
        matchNumber: matches.matchNumber,
        stage: matches.stage,
        groupName: matches.groupName,
        teamA: matches.teamA,
        teamB: matches.teamB,
        venue: matches.venue,
        scheduledAt: matches.scheduledAt,
        status: matches.status,
        winner: matches.winner,
        winnerTeamName: matches.winnerTeamName,
        resultSummary: matches.resultSummary,
        tossWinner: matches.tossWinner,
        tossDecision: matches.tossDecision,
        predictionCount: sql<number>`count(${predictions.id})`.as(
          "prediction_count"
        ),
      })
      .from(matches)
      .leftJoin(
        predictions,
        and(
          eq(predictions.matchId, matches.id),
          eq(predictions.isLatest, true)
        )
      )
      .where(where)
      .groupBy(matches.id)
      .orderBy(asc(matches.scheduledAt));

    return NextResponse.json(allMatches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
