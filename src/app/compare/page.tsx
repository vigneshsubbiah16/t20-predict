export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { matches, predictions, agents } from "@/db/schema";
import { eq, asc, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENT_CONFIGS } from "@/lib/agents-config";
import { formatMatchLabel } from "@/lib/utils";
import { LocalDateTime } from "@/components/LocalDateTime";

export const metadata: Metadata = {
  title: "Compare Agents - T20 Predict",
  description:
    "Side-by-side comparison of all AI agent predictions across every T20 World Cup 2026 match.",
};

export default async function ComparePage() {
  // Fetch all settled matches (completed + abandoned)
  const allMatches = await db
    .select()
    .from(matches)
    .where(sql`${matches.status} IN ('completed', 'abandoned')`)
    .orderBy(asc(matches.scheduledAt));

  // Fetch all latest predictions
  const allPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.isLatest, true));

  // Build a lookup: matchId -> agentId -> prediction
  const predMap = new Map<string, Map<string, typeof allPredictions[0]>>();
  for (const pred of allPredictions) {
    if (!predMap.has(pred.matchId)) {
      predMap.set(pred.matchId, new Map());
    }
    predMap.get(pred.matchId)!.set(pred.agentId, pred);
  }

  // Agent order
  const agentOrder = AGENT_CONFIGS.map((a) => a.id);

  // Stats per agent
  const agentStats = new Map<string, { correct: number; wrong: number; total: number }>();
  for (const a of AGENT_CONFIGS) {
    agentStats.set(a.id, { correct: 0, wrong: 0, total: 0 });
  }

  for (const match of allMatches) {
    if (match.status !== "completed") continue;
    const matchPreds = predMap.get(match.id);
    if (!matchPreds) continue;
    for (const agentId of agentOrder) {
      const pred = matchPreds.get(agentId);
      if (!pred) continue;
      const stats = agentStats.get(agentId)!;
      stats.total++;
      if (pred.isCorrect) stats.correct++;
      else stats.wrong++;
    }
  }

  // Group matches by stage
  const groupMatches = allMatches.filter((m) => m.stage === "group");
  const super8Matches = allMatches.filter((m) => m.stage === "super8");
  const knockoutMatches = allMatches.filter(
    (m) => m.stage === "semi" || m.stage === "final"
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Agent Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Every match, every pick, side by side.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {AGENT_CONFIGS.map((agent) => {
            const stats = agentStats.get(agent.id)!;
            const accuracy =
              stats.total > 0
                ? Math.round((stats.correct / stats.total) * 100)
                : 0;
            return (
              <Card key={agent.id} className="border-l-4" style={{ borderLeftColor: agent.color }}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">{agent.displayName}</p>
                  <p className="text-2xl font-black font-mono">
                    {stats.correct}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{stats.total}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{accuracy}% accuracy</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
            Wrong
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
            Abandoned / No pick
          </span>
        </div>

        {/* Group Stage */}
        {groupMatches.length > 0 && (
          <MatchSection
            title="Group Stage"
            matches={groupMatches}
            predMap={predMap}
            agentOrder={agentOrder}
          />
        )}

        {/* Super 8 */}
        {super8Matches.length > 0 && (
          <MatchSection
            title="Super 8"
            matches={super8Matches}
            predMap={predMap}
            agentOrder={agentOrder}
          />
        )}

        {/* Knockouts */}
        {knockoutMatches.length > 0 && (
          <MatchSection
            title="Knockouts"
            matches={knockoutMatches}
            predMap={predMap}
            agentOrder={agentOrder}
          />
        )}
      </div>
    </main>
  );
}

function MatchSection({
  title,
  matches: sectionMatches,
  predMap,
  agentOrder,
}: {
  title: string;
  matches: {
    id: string;
    matchNumber: number;
    stage: string;
    groupName: string | null;
    teamA: string;
    teamB: string;
    venue: string;
    scheduledAt: string;
    status: string;
    winner: string | null;
    winnerTeamName: string | null;
    resultSummary: string | null;
  }[];
  predMap: Map<string, Map<string, { agentId: string; predictedTeamName: string; predictedWinner: string; confidence: number; isCorrect: boolean | null; pnl: number | null }>>;
  agentOrder: string[];
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground min-w-[180px]">
                  Match
                </th>
                <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground min-w-[80px]">
                  Winner
                </th>
                {AGENT_CONFIGS.map((agent) => (
                  <th
                    key={agent.id}
                    className="text-center py-2 px-2 font-medium text-xs min-w-[90px]"
                    style={{ color: agent.color }}
                  >
                    {agent.initials}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionMatches.map((match) => {
                const matchPreds = predMap.get(match.id);
                const isAbandoned = match.status === "abandoned";

                return (
                  <tr key={match.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-2 px-3">
                      <Link
                        href={`/matches/${match.id}`}
                        className="hover:underline"
                      >
                        <span className="font-medium">
                          {match.teamA} vs {match.teamB}
                        </span>
                      </Link>
                      <div className="text-[10px] text-muted-foreground">
                        <LocalDateTime dateString={match.scheduledAt} format="date-only" />
                        {" · "}
                        {formatMatchLabel(match.stage, match.groupName)}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {isAbandoned ? (
                        <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500">
                          No result
                        </Badge>
                      ) : (
                        <span className="font-semibold text-xs">
                          {match.winnerTeamName}
                        </span>
                      )}
                    </td>
                    {agentOrder.map((agentId) => {
                      const pred = matchPreds?.get(agentId);
                      if (!pred || isAbandoned) {
                        return (
                          <td key={agentId} className="py-2 px-2 text-center">
                            <span className="inline-block px-2 py-1 rounded text-[10px] bg-gray-50 text-gray-400">
                              —
                            </span>
                          </td>
                        );
                      }

                      const isCorrect = pred.isCorrect === true;
                      const isWrong = pred.isCorrect === false;

                      return (
                        <td key={agentId} className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-[11px] font-medium ${
                              isCorrect
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isWrong
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {pred.predictedTeamName}
                            <span className="text-[9px] ml-0.5 opacity-60">
                              {Math.round(pred.confidence * 100)}%
                            </span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
