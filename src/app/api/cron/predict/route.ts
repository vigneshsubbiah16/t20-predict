import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find upcoming matches within 48 hours, sorted by scheduled time
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

    // Sort by scheduled time (soonest first)
    upcomingMatches.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    const activeAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true));

    // Find the first match that still needs predictions
    let targetMatch = null;
    let window = "pre_match";
    let agentsToCall: typeof activeAgents = [];
    let skipped = 0;

    for (const match of upcomingMatches) {
      const hasXi = match.playingXiA && match.playingXiB;
      const w = hasXi ? "post_xi" : "pre_match";

      const existingPreds = await db
        .select({ agentId: predictions.agentId })
        .from(predictions)
        .where(
          and(
            eq(predictions.matchId, match.id),
            eq(predictions.predictionWindow, w)
          )
        );
      const existingAgentIds = new Set(existingPreds.map((p) => p.agentId));
      const remaining = activeAgents.filter((a) => !existingAgentIds.has(a.id));

      if (remaining.length > 0) {
        targetMatch = match;
        window = w;
        agentsToCall = remaining;
        skipped = activeAgents.length - remaining.length;
        break;
      }
    }

    if (!targetMatch) {
      return NextResponse.json({
        success: true,
        message: "All upcoming matches within 48h already have predictions",
        matchesChecked: upcomingMatches.length,
      });
    }

    // Call all agents in parallel for this one match
    const { callAgent } = await import("@/lib/agents/orchestrator");
    const agentResults = await Promise.allSettled(
      agentsToCall.map((agent) => callAgent(targetMatch!, agent))
    );

    let predictionsCreated = 0;
    const errors: string[] = [];
    for (let i = 0; i < agentResults.length; i++) {
      if (agentResults[i].status === "fulfilled") {
        predictionsCreated++;
      } else {
        const reason = String((agentResults[i] as PromiseRejectedResult).reason);
        errors.push(`${agentsToCall[i].displayName}: ${reason}`);
        console.error(
          `Failed: ${agentsToCall[i].displayName} for ${targetMatch.id}:`,
          reason,
        );
      }
    }

    return NextResponse.json({
      success: true,
      match: {
        id: targetMatch.id,
        teams: `${targetMatch.teamA} vs ${targetMatch.teamB}`,
        window,
        predictionsCreated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
      remainingMatches: upcomingMatches.length - 1,
    });
  } catch (error) {
    console.error("Cron predict error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
