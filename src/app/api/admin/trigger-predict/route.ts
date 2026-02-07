import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const maxDuration = 120;

/**
 * POST /api/admin/trigger-predict
 * Manually trigger predictions for a specific match.
 * Body: { matchId, agentIds? (optional — defaults to all active agents) }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { matchId, agentIds } = body as {
      matchId: string;
      agentIds?: string[];
    };

    if (!matchId) {
      return NextResponse.json({ error: "matchId required" }, { status: 400 });
    }

    const match = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    let activeAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true));

    if (agentIds && agentIds.length > 0) {
      activeAgents = activeAgents.filter((a) => agentIds.includes(a.id));
    }

    const m = match[0];
    const hasXi = m.playingXiA && m.playingXiB;
    const window = hasXi ? "post_xi" : "pre_match";

    // If post_xi, mark previous pre_match predictions as not latest
    if (window === "post_xi") {
      await db
        .update(predictions)
        .set({ isLatest: false })
        .where(
          and(
            eq(predictions.matchId, matchId),
            eq(predictions.predictionWindow, "pre_match")
          )
        );
    }

    const { callAgent } = await import("@/lib/agents/orchestrator");

    const results = await Promise.allSettled(
      activeAgents.map((agent) => callAgent(m, agent))
    );

    const summary = results.map((r, i) => ({
      agent: activeAgents[i].displayName,
      status: r.status,
      ...(r.status === "fulfilled"
        ? { prediction: r.value }
        : { error: String(r.reason) }),
    }));

    return NextResponse.json({
      success: true,
      matchId,
      window,
      results: summary,
    });
  } catch (error) {
    console.error("Trigger predict error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
