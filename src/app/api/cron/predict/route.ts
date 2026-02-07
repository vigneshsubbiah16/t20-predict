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
    const url = new URL(request.url);
    const agentIdParam = url.searchParams.get("agentId");

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

    // Sort by scheduled time (soonest first)
    upcomingMatches.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    // Get the specific agent or all active agents
    let targetAgents;
    if (agentIdParam) {
      targetAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentIdParam), eq(agents.isActive, true)));
    } else {
      targetAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.isActive, true));
    }

    if (targetAgents.length === 0) {
      return NextResponse.json({
        success: true,
        message: agentIdParam ? `Agent ${agentIdParam} not found or inactive` : "No active agents",
      });
    }

    // Find the first match that still needs predictions from this agent
    for (const match of upcomingMatches) {
      const hasXi = match.playingXiA && match.playingXiB;
      const window = hasXi ? "post_xi" : "pre_match";

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
      const agentsToCall = targetAgents.filter((a) => !existingAgentIds.has(a.id));

      if (agentsToCall.length === 0) continue;

      // Call agent(s) — typically just 1 when agentId is specified
      const { callAgent } = await import("@/lib/agents/orchestrator");
      const agentResults = await Promise.allSettled(
        agentsToCall.map((agent) => callAgent(match, agent))
      );

      let predictionsCreated = 0;
      const errors: string[] = [];
      for (let i = 0; i < agentResults.length; i++) {
        if (agentResults[i].status === "fulfilled") {
          predictionsCreated++;
        } else {
          const reason = String((agentResults[i] as PromiseRejectedResult).reason);
          errors.push(`${agentsToCall[i].displayName}: ${reason}`);
          console.error(`Failed: ${agentsToCall[i].displayName} for ${match.id}:`, reason);
        }
      }

      return NextResponse.json({
        success: true,
        match: {
          id: match.id,
          teams: `${match.teamA} vs ${match.teamB}`,
          window,
          predictionsCreated,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "All upcoming matches within 48h already have predictions",
      matchesChecked: upcomingMatches.length,
    });
  } catch (error) {
    console.error("Cron predict error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
