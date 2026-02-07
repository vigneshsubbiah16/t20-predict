import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";
import { calculatePnl, calculateBrierScore } from "@/lib/scoring";

export const maxDuration = 60;

interface EspnMatchResult {
  winner: "team_a" | "team_b";
  winnerTeamName: string;
  resultSummary: string;
}

async function fetchEspnResult(espnId: string): Promise<EspnMatchResult | null> {
  try {
    const res = await fetch(
      `https://www.espncricinfo.com/matches/engine/match/${espnId}.json`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const match = data.match;
    if (!match || match.match_status !== "complete") return null;

    const winnerId = match.winner_team_id;
    const team1 = data.team?.[0];
    const team2 = data.team?.[1];

    if (!winnerId || !team1 || !team2) return null;

    const isTeamA = String(team1.team_id) === String(winnerId);
    return {
      winner: isTeamA ? "team_a" : "team_b",
      winnerTeamName: isTeamA ? team1.team_name : team2.team_name,
      resultSummary: match.result_text || "",
    };
  } catch (err) {
    console.error(`ESPN fetch failed for ${espnId}:`, err);
    return null;
  }
}

async function settlePredictions(matchId: string, winner: "team_a" | "team_b") {
  // Get all latest predictions for this match
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
  return settled;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find matches that might be completed (scheduled in the past, status still upcoming/live)
    const now = new Date();
    const pendingMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "upcoming"),
        )
      );

    // Filter to matches whose scheduled time + 5 hours is in the past (match should be over)
    const possiblyCompleted = pendingMatches.filter((m) => {
      const matchEnd = new Date(new Date(m.scheduledAt).getTime() + 5 * 60 * 60 * 1000);
      return matchEnd < now;
    });

    const results: Array<{ matchId: string; status: string; settled?: number }> = [];

    for (const match of possiblyCompleted) {
      if (!match.espnId) {
        results.push({ matchId: match.id, status: "no_espn_id" });
        continue;
      }

      const result = await fetchEspnResult(match.espnId);
      if (!result) {
        results.push({ matchId: match.id, status: "not_completed_yet" });
        continue;
      }

      // Update match
      await db
        .update(matches)
        .set({
          status: "completed",
          winner: result.winner,
          winnerTeamName: result.winnerTeamName,
          resultSummary: result.resultSummary,
        })
        .where(eq(matches.id, match.id));

      // Settle predictions
      const settled = await settlePredictions(match.id, result.winner);
      results.push({ matchId: match.id, status: "settled", settled });
    }

    return NextResponse.json({
      success: true,
      matchesChecked: possiblyCompleted.length,
      results,
    });
  } catch (error) {
    console.error("Cron results error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
