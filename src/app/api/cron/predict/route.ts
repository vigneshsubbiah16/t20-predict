import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
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

      // Check which agents already have predictions (idempotency)
      const existingPreds = await db
        .select({ agentId: predictions.agentId })
        .from(predictions)
        .where(
          and(
            eq(predictions.matchId, match.id),
            eq(predictions.predictionWindow, window)
          )
        );
      const existingAgentIds = new Set(existingPreds.map((p) => p.agentId));

      const agentsToCall = activeAgents.filter((a) => !existingAgentIds.has(a.id));
      const skipped = activeAgents.length - agentsToCall.length;

      // Call all agents in parallel
      const { callAgent } = await import("@/lib/agents/orchestrator");
      const agentResults = await Promise.allSettled(
        agentsToCall.map((agent) => callAgent(match, agent))
      );

      let predictionsCreated = 0;
      for (let i = 0; i < agentResults.length; i++) {
        if (agentResults[i].status === "fulfilled") {
          predictionsCreated++;
        } else {
          console.error(
            `Failed to get prediction from ${agentsToCall[i].displayName} for match ${match.id}:`,
            (agentResults[i] as PromiseRejectedResult).reason,
          );
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
