import { db } from "@/db";
import { agents, matches, predictions } from "@/db/schema";
import { eq, and, desc, asc, sql, count, max } from "drizzle-orm";
import { STARTING_BANKROLL } from "@/lib/scoring";
import type {
  Match,
  MatchWithPredictions,
  LeaderboardEntry,
  ActivityItem,
  AgentProfile,
  Agent,
} from "@/lib/api";

// ============ HELPERS ============

function calculateStreaks(settledPreds: { isCorrect: boolean | null }[]): {
  currentStreak: number;
  bestStreak: number;
} {
  let bestStreak = 0;
  let tempStreak = 0;

  for (const pred of settledPreds) {
    if (pred.isCorrect) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current streak: count from the end
  let currentStreak = 0;
  for (let i = settledPreds.length - 1; i >= 0; i--) {
    if (settledPreds[i].isCorrect) {
      currentStreak++;
    } else {
      // Count consecutive losses from the end
      let losses = 0;
      for (let j = settledPreds.length - 1; j >= 0; j--) {
        if (!settledPreds[j].isCorrect) losses++;
        else break;
      }
      currentStreak = -losses;
      break;
    }
  }

  return { currentStreak, bestStreak };
}

// ============ MATCHES ============

export async function getMatchesFromDb(params?: {
  status?: string;
  stage?: string;
}): Promise<Match[]> {
  let query = db.select().from(matches).orderBy(asc(matches.scheduledAt));

  const conditions = [];
  if (params?.status) {
    conditions.push(eq(matches.status, params.status));
  }
  if (params?.stage) {
    conditions.push(eq(matches.stage, params.stage));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query;

  // Get prediction counts
  const predCounts = await db
    .select({
      matchId: predictions.matchId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(predictions)
    .where(eq(predictions.isLatest, true))
    .groupBy(predictions.matchId);

  const countMap = new Map(predCounts.map((p) => [p.matchId, p.count]));

  return rows.map((r) => ({
    ...r,
    predictionCount: countMap.get(r.id) || 0,
  }));
}

export async function getMatchFromDb(id: string): Promise<MatchWithPredictions | null> {
  const matchRows = await db
    .select()
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);

  if (matchRows.length === 0) return null;
  const match = matchRows[0];

  const preds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, id))
    .orderBy(desc(predictions.confidence));

  // Get agent info for each prediction
  const agentRows = await db.select().from(agents);
  const agentMap = new Map(agentRows.map((a) => [a.id, a]));

  return {
    ...match,
    predictions: preds.map((p) => ({
      ...p,
      isLatest: p.isLatest ?? false,
      isCorrect: p.isCorrect ?? null,
      agent: agentMap.get(p.agentId) || undefined,
    })),
  } as MatchWithPredictions;
}

export async function getAdjacentMatches(
  scheduledAt: string,
  matchNumber: number
): Promise<{ prev: Match | null; next: Match | null }> {
  const [prevRows, nextRows] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(
        sql`${matches.scheduledAt} < ${scheduledAt} OR (${matches.scheduledAt} = ${scheduledAt} AND ${matches.matchNumber} < ${matchNumber})`
      )
      .orderBy(desc(matches.scheduledAt), desc(matches.matchNumber))
      .limit(1),
    db
      .select()
      .from(matches)
      .where(
        sql`${matches.scheduledAt} > ${scheduledAt} OR (${matches.scheduledAt} = ${scheduledAt} AND ${matches.matchNumber} > ${matchNumber})`
      )
      .orderBy(asc(matches.scheduledAt), asc(matches.matchNumber))
      .limit(1),
  ]);

  return {
    prev: prevRows[0] ? { ...prevRows[0], predictionCount: 0 } : null,
    next: nextRows[0] ? { ...nextRows[0], predictionCount: 0 } : null,
  };
}

// ============ LEADERBOARD ============

export async function getLeaderboardFromDb(sort?: string): Promise<LeaderboardEntry[]> {
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));

  const entries: LeaderboardEntry[] = [];

  for (const agent of agentRows) {
    // Get all latest, settled predictions for this agent
    const settledPreds = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.agentId, agent.id),
          eq(predictions.isLatest, true),
          sql`${predictions.isCorrect} IS NOT NULL`
        )
      )
      .orderBy(asc(predictions.createdAt));

    const totalPredictions = settledPreds.length;
    const correctPredictions = settledPreds.filter((p) => p.isCorrect).length;
    const points = correctPredictions;
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    const totalPnl = settledPreds.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const bankroll = STARTING_BANKROLL + totalPnl;
    const avgBrier =
      totalPredictions > 0
        ? settledPreds.reduce((sum, p) => sum + (p.brierScore || 0), 0) / totalPredictions
        : 0;

    const { currentStreak, bestStreak } = calculateStreaks(settledPreds);

    entries.push({
      agentId: agent.id,
      displayName: agent.displayName,
      slug: agent.slug,
      color: agent.color,
      provider: agent.provider,
      points,
      totalPredictions,
      correctPredictions,
      accuracy,
      totalPnl: Math.round(totalPnl * 100) / 100,
      bankroll: Math.round(bankroll * 100) / 100,
      avgBrier: Math.round(avgBrier * 10000) / 10000,
      currentStreak,
      bestStreak,
    });
  }

  // Sort
  switch (sort) {
    case "pnl":
      entries.sort((a, b) => b.totalPnl - a.totalPnl);
      break;
    case "brier":
      entries.sort((a, b) => (a.avgBrier || 999) - (b.avgBrier || 999));
      break;
    default: // points
      entries.sort((a, b) => b.points - a.points || b.totalPnl - a.totalPnl);
  }

  return entries;
}

// ============ AGENTS ============

export async function getAgentsFromDb(): Promise<Agent[]> {
  return db.select().from(agents).where(eq(agents.isActive, true)) as Promise<Agent[]>;
}

export async function getAgentProfileFromDb(slug: string): Promise<AgentProfile | null> {
  const agentRows = await db
    .select()
    .from(agents)
    .where(eq(agents.slug, slug))
    .limit(1);

  if (agentRows.length === 0) return null;
  const agent = agentRows[0];

  // Get all latest predictions for this agent
  const preds = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.agentId, agent.id), eq(predictions.isLatest, true)))
    .orderBy(desc(predictions.createdAt));

  // Get match info for each prediction
  const matchIds = [...new Set(preds.map((p) => p.matchId))];
  const matchRows = matchIds.length > 0
    ? await db.select().from(matches).where(sql`${matches.id} IN (${sql.join(matchIds.map(id => sql`${id}`), sql`,`)})`)
    : [];
  const matchMap = new Map(matchRows.map((m) => [m.id, m]));

  const settledPreds = preds.filter((p) => p.isCorrect !== null);
  const correctPreds = settledPreds.filter((p) => p.isCorrect);
  const totalPnl = settledPreds.reduce((sum, p) => sum + (p.pnl || 0), 0);

  // Streaks (sorted chronologically for correct ordering)
  const sortedSettled = [...settledPreds].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const { currentStreak, bestStreak } = calculateStreaks(sortedSettled);

  // Head to head
  const otherAgents = await db
    .select()
    .from(agents)
    .where(and(eq(agents.isActive, true), sql`${agents.id} != ${agent.id}`));

  const headToHead = [];
  for (const other of otherAgents) {
    const otherPreds = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.agentId, other.id), eq(predictions.isLatest, true)));

    const otherPredMap = new Map(otherPreds.map((p) => [p.matchId, p.predictedWinner]));

    let agree = 0;
    let total = 0;
    for (const pred of preds) {
      const otherPick = otherPredMap.get(pred.matchId);
      if (otherPick) {
        total++;
        if (otherPick === pred.predictedWinner) agree++;
      }
    }

    headToHead.push({
      agentId: other.id,
      displayName: other.displayName,
      agreementPct: total > 0 ? agree / total : 0,
    });
  }

  // Personality insights
  const insights: string[] = [];
  if (preds.length >= 3) {
    const avgConf = preds.reduce((s, p) => s + p.confidence, 0) / preds.length;
    if (avgConf > 0.72) insights.push(`Most confident predictor (avg ${Math.round(avgConf * 100)}%)`);
    if (avgConf < 0.60) insights.push(`Cautious predictor (avg confidence ${Math.round(avgConf * 100)}%)`);

    // Check if changed mind often
    const allPreds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.agentId, agent.id));
    const changedMind = allPreds.filter((p) => !p.isLatest).length;
    if (changedMind > 2) insights.push(`Changed mind ${changedMind} times after XI reveals`);

    if (settledPreds.length >= 3) {
      if (correctPreds.length / settledPreds.length > 0.65) {
        insights.push("Strong track record — right more often than not");
      }
      if (bestStreak >= 3) {
        insights.push(`Best winning streak: ${bestStreak} in a row`);
      }
    }
  }

  return {
    ...agent,
    stats: {
      points: correctPreds.length,
      totalPnl: Math.round(totalPnl * 100) / 100,
      bankroll: Math.round((STARTING_BANKROLL + totalPnl) * 100) / 100,
      avgBrier:
        settledPreds.length > 0
          ? Math.round(
              (settledPreds.reduce((s, p) => s + (p.brierScore || 0), 0) /
                settledPreds.length) *
                10000
            ) / 10000
          : 0,
      accuracy:
        settledPreds.length > 0 ? correctPreds.length / settledPreds.length : 0,
      totalPredictions: settledPreds.length,
      correctPredictions: correctPreds.length,
      currentStreak,
      bestStreak,
    },
    predictions: preds.map((p) => ({
      ...p,
      isLatest: p.isLatest ?? false,
      isCorrect: p.isCorrect ?? null,
      match: matchMap.get(p.matchId) || ({} as Match),
    })),
    headToHead,
    insights,
  } as AgentProfile;
}

// ============ ACTIVITY FEED ============

export async function getRecentPredictionsFromDb(limit = 20): Promise<ActivityItem[]> {
  const preds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.isLatest, true))
    .orderBy(desc(predictions.createdAt))
    .limit(limit);

  if (preds.length === 0) return [];

  const agentRows = await db.select().from(agents);
  const agentMap = new Map(agentRows.map((a) => [a.id, a]));

  const matchIds = [...new Set(preds.map((p) => p.matchId))];
  const matchRows = await db.select().from(matches).where(
    sql`${matches.id} IN (${sql.join(matchIds.map(id => sql`${id}`), sql`,`)})`
  );
  const matchMap = new Map(matchRows.map((m) => [m.id, m]));

  return preds.map((p) => {
    const agent = agentMap.get(p.agentId);
    const match = matchMap.get(p.matchId);
    return {
      id: p.id,
      agentName: agent?.displayName || p.agentId,
      agentSlug: agent?.slug || p.agentId,
      agentColor: agent?.color || "#888",
      teamA: match?.teamA || "",
      teamB: match?.teamB || "",
      matchId: p.matchId,
      predictedTeamName: p.predictedTeamName,
      confidence: p.confidence,
      createdAt: p.createdAt,
    };
  });
}

// ============ SEASON STATS ============

export async function getSeasonStatsFromDb(): Promise<{
  totalMatches: number;
  completedMatches: number;
  totalPredictions: number;
  bestSingleMatchPnl: number;
}> {
  const [allMatches, completed, totalPreds, bestPnl] = await Promise.all([
    db.select({ cnt: count() }).from(matches),
    db.select({ cnt: count() }).from(matches).where(eq(matches.status, "completed")),
    db.select({ cnt: count() }).from(predictions).where(eq(predictions.isLatest, true)),
    db.select({ best: max(predictions.pnl) }).from(predictions).where(eq(predictions.isLatest, true)),
  ]);

  return {
    totalMatches: allMatches[0]?.cnt ?? 0,
    completedMatches: completed[0]?.cnt ?? 0,
    totalPredictions: totalPreds[0]?.cnt ?? 0,
    bestSingleMatchPnl: bestPnl[0]?.best ?? 0,
  };
}
