import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";
import { searchTeamNews } from "@/lib/cricket-search";
import { isValidEspnId } from "@/lib/validation";

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
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Find matches within 6 hours ahead or 2 hours behind that don't have XI/toss yet
    const upcoming = await db
      .select()
      .from(matches)
      .where(
        and(
          lte(matches.scheduledAt, in6h.toISOString()),
          gte(matches.scheduledAt, twoHoursAgo.toISOString()),
          isNull(matches.xiAnnouncedAt)
        )
      );

    const results: Array<{ matchId: string; status: string }> = [];

    for (const match of upcoming) {
      // Try ESPN first if we have an ID, otherwise use AI web search
      let xiData: {
        playingXiA: string[] | null;
        playingXiB: string[] | null;
        tossWinner: string | null;
        tossDecision: string | null;
      } | null = null;

      if (match.espnId && isValidEspnId(match.espnId)) {
        xiData = await fetchPlayingXI(match.espnId);
      } else if (match.espnId) {
        console.error(`Invalid espnId for match ${match.id}: ${match.espnId}`);
      }

      if (!xiData) {
        const aiResult = await searchTeamNews(
          match.teamA,
          match.teamB,
          match.scheduledAt,
        );
        if (aiResult?.tossOccurred) {
          xiData = {
            playingXiA: aiResult.playingXiA,
            playingXiB: aiResult.playingXiB,
            tossWinner: aiResult.tossWinner,
            tossDecision: aiResult.tossDecision,
          };
        }
      }

      if (!xiData || (!xiData.playingXiA && !xiData.playingXiB && !xiData.tossWinner)) {
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
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
