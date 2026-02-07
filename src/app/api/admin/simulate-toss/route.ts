import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/admin/simulate-toss
 * Simulates a toss and playing XI announcement for a match.
 * Body: { matchId, tossWinner (team name), tossDecision, playingXiA, playingXiB }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { matchId, tossWinner, tossDecision, playingXiA, playingXiB } = body as {
      matchId: string;
      tossWinner: string;
      tossDecision: string;
      playingXiA: string[];
      playingXiB: string[];
    };

    if (!matchId || !tossWinner || !tossDecision) {
      return NextResponse.json(
        { error: "matchId, tossWinner, tossDecision required" },
        { status: 400 }
      );
    }

    const match = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    await db
      .update(matches)
      .set({
        tossWinner,
        tossDecision,
        playingXiA: playingXiA ? JSON.stringify(playingXiA) : null,
        playingXiB: playingXiB ? JSON.stringify(playingXiB) : null,
        xiAnnouncedAt: new Date().toISOString(),
      })
      .where(eq(matches.id, matchId));

    return NextResponse.json({
      success: true,
      matchId,
      tossWinner,
      tossDecision,
      xiAnnounced: !!(playingXiA && playingXiB),
    });
  } catch (error) {
    console.error("Simulate toss error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
