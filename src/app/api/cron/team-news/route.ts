import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

async function fetchPlayingXI(espnId: string): Promise<{
  playingXiA: string[] | null;
  playingXiB: string[] | null;
  tossWinner: string | null;
  tossDecision: string | null;
} | null> {
  try {
    const res = await fetch(
      `https://www.espncricinfo.com/matches/engine/match/${espnId}.json`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;

    const data = await res.json();

    // Check if playing XI is available
    const team1 = data.team?.[0];
    const team2 = data.team?.[1];
    if (!team1 || !team2) return null;

    // Extract playing XI from squad data
    const getXI = (teamData: Record<string, unknown>): string[] | null => {
      const squad = teamData.squad as Array<{ player_name: string; playing_xi: string }> | undefined;
      if (!squad) return null;
      const xi = squad.filter((p) => p.playing_xi === "1").map((p) => p.player_name);
      return xi.length === 11 ? xi : null;
    };

    const playingXiA = getXI(team1);
    const playingXiB = getXI(team2);

    if (!playingXiA && !playingXiB) return null;

    // Extract toss info
    const tossWinner = data.match?.toss_winner_team_name || null;
    const tossDecision = data.match?.toss_decision_name?.toLowerCase() || null;

    return { playingXiA, playingXiB, tossWinner, tossDecision };
  } catch (err) {
    console.error(`ESPN XI fetch failed for ${espnId}:`, err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // Find matches within 6 hours that don't have XI yet
    const upcoming = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "upcoming"),
          lte(matches.scheduledAt, in6h.toISOString()),
          gte(matches.scheduledAt, now.toISOString()),
          isNull(matches.xiAnnouncedAt)
        )
      );

    const results: Array<{ matchId: string; status: string }> = [];

    for (const match of upcoming) {
      if (!match.espnId) {
        results.push({ matchId: match.id, status: "no_espn_id" });
        continue;
      }

      const xiData = await fetchPlayingXI(match.espnId);
      if (!xiData || (!xiData.playingXiA && !xiData.playingXiB)) {
        results.push({ matchId: match.id, status: "xi_not_available" });
        continue;
      }

      await db
        .update(matches)
        .set({
          playingXiA: xiData.playingXiA ? JSON.stringify(xiData.playingXiA) : null,
          playingXiB: xiData.playingXiB ? JSON.stringify(xiData.playingXiB) : null,
          tossWinner: xiData.tossWinner,
          tossDecision: xiData.tossDecision,
          xiAnnouncedAt: new Date().toISOString(),
        })
        .where(eq(matches.id, match.id));

      results.push({ matchId: match.id, status: "xi_updated" });
    }

    return NextResponse.json({
      success: true,
      matchesChecked: upcoming.length,
      results,
    });
  } catch (error) {
    console.error("Cron team-news error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
