import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 120; // 2 min for Vercel

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find upcoming matches within 48 hours
    const upcomingMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "upcoming"),
          lte(matches.scheduledAt, in48h.toISOString()),
          gte(matches.scheduledAt, now.toISOString())
        )
      );

    const activeAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true));

    const results: Array<{
      matchId: string;
      window: string;
      predictionsCreated: number;
      skipped: number;
    }> = [];

    for (const match of upcomingMatches) {
      // Determine prediction window
      const hasXi = match.playingXiA && match.playingXiB;
      const window = hasXi ? "post_xi" : "pre_match";

      let predictionsCreated = 0;
      let skipped = 0;

      for (const agent of activeAgents) {
        // Idempotency: skip if prediction already exists for this match+agent+window
        const existing = await db
          .select({ id: predictions.id })
          .from(predictions)
          .where(
            and(
              eq(predictions.matchId, match.id),
              eq(predictions.agentId, agent.id),
              eq(predictions.predictionWindow, window)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Dynamically import orchestrator to avoid loading AI SDKs at module level
        try {
          const { callAgent } = await import("@/lib/agents/orchestrator");
          await callAgent(match, agent);
          predictionsCreated++;
        } catch (err) {
          console.error(`Failed to get prediction from ${agent.displayName} for match ${match.id}:`, err);
        }
      }

      results.push({
        matchId: match.id,
        window,
        predictionsCreated,
        skipped,
      });
    }

    return NextResponse.json({
      success: true,
      matchesProcessed: upcomingMatches.length,
      results,
    });
  } catch (error) {
    console.error("Cron predict error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
