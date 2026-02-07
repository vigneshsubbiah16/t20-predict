import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { calculatePnl, calculateBrierScore } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { matchId, winner, winnerTeamName, resultSummary, status } = body as {
      matchId: string;
      winner: "team_a" | "team_b";
      winnerTeamName?: string;
      resultSummary?: string;
      status?: "completed" | "abandoned";
    };

    if (!matchId || (!winner && status !== "abandoned")) {
      return NextResponse.json(
        { error: "matchId and winner required (or status=abandoned)" },
        { status: 400 }
      );
    }

    // Update match
    const match = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (status === "abandoned") {
      await db
        .update(matches)
        .set({ status: "abandoned" })
        .where(eq(matches.id, matchId));

      // Null out all predictions for this match
      await db
        .update(predictions)
        .set({ isCorrect: null, pointsAwarded: 0, pnl: 0, brierScore: null })
        .where(and(eq(predictions.matchId, matchId), eq(predictions.isLatest, true)));

      return NextResponse.json({ success: true, status: "abandoned" });
    }

    const m = match[0];
    await db
      .update(matches)
      .set({
        status: "completed",
        winner,
        winnerTeamName: winnerTeamName || (winner === "team_a" ? m.teamA : m.teamB),
        resultSummary: resultSummary || "",
      })
      .where(eq(matches.id, matchId));

    // Settle predictions
    const preds = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.matchId, matchId),
          eq(predictions.isLatest, true),
          isNull(predictions.isCorrect)
        )
      );

    let settled = 0;
    for (const pred of preds) {
      const isCorrect = pred.predictedWinner === winner;
      const pnl = calculatePnl(pred.confidence, isCorrect);
      const brierScore = calculateBrierScore(pred.confidence, isCorrect);

      await db
        .update(predictions)
        .set({
          isCorrect,
          pointsAwarded: isCorrect ? 1 : 0,
          pnl,
          brierScore,
        })
        .where(eq(predictions.id, pred.id));
      settled++;
    }

    return NextResponse.json({
      success: true,
      matchId,
      winner,
      predictionsSettled: settled,
    });
  } catch (error) {
    console.error("Manual settle error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
