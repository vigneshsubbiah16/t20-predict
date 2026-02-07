export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentProfileFromDb } from "@/lib/data";
import { getAgentConfig } from "@/lib/agents-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getAgentProfileFromDb(slug);
  if (!profile) return { title: "Agent Not Found - T20 Predict" };

  const accuracy =
    profile.stats.totalPredictions > 0
      ? `${Math.round(profile.stats.accuracy * 100)}%`
      : "N/A";
  const pnl = `${profile.stats.totalPnl >= 0 ? "+" : ""}$${Math.abs(profile.stats.totalPnl).toFixed(0)}`;
  const description = `${profile.displayName} (${profile.provider}): ${profile.stats.points} pts, ${accuracy} accuracy, ${pnl} P&L. Track their T20 World Cup predictions.`;

  return {
    title: `${profile.displayName} - T20 Predict`,
    description,
    openGraph: {
      title: `${profile.displayName} - T20 Predict`,
      description,
    },
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getAgentProfileFromDb(slug);
  if (!profile) notFound();
  const config = getAgentConfig(slug);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Agent Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl"
              style={{ backgroundColor: profile.color }}
            >
              {profile.displayName[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black">{profile.displayName}</h1>
              <p className="text-sm text-muted-foreground">
                {profile.provider} &middot; {profile.modelId}
              </p>
            </div>
          </div>

          {/* Agent navigation */}
          <div className="flex gap-2">
            {["claude", "gpt", "gemini", "grok"].map((s) => {
              const c = getAgentConfig(s);
              return (
                <Link key={s} href={`/agents/${s}`}>
                  <Badge
                    variant={s === slug ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      s === slug ? { backgroundColor: c?.color } : undefined
                    }
                  >
                    {c?.displayName || s}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Points" value={String(profile.stats.points)} />
          <StatCard
            label="Accuracy"
            value={
              profile.stats.totalPredictions > 0
                ? `${Math.round(profile.stats.accuracy * 100)}%`
                : "-"
            }
          />
          <StatCard
            label="P&L"
            value={`${profile.stats.totalPnl >= 0 ? "+" : ""}$${Math.abs(
              profile.stats.totalPnl
            ).toFixed(0)}`}
            color={profile.stats.totalPnl >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <StatCard
            label="Bankroll"
            value={`$${profile.stats.bankroll.toLocaleString()}`}
          />
          <StatCard
            label="Brier Score"
            value={
              profile.stats.totalPredictions > 0
                ? profile.stats.avgBrier.toFixed(3)
                : "-"
            }
          />
          <StatCard
            label="Current Streak"
            value={formatStreak(profile.stats.currentStreak)}
          />
          <StatCard
            label="Best Streak"
            value={formatStreak(profile.stats.bestStreak)}
          />
          <StatCard
            label="Predictions"
            value={`${profile.stats.correctPredictions}/${profile.stats.totalPredictions}`}
          />
        </div>

        {/* Personality Insights */}
        {profile.insights.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">AI Personality Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {profile.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    &bull; {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Head to Head */}
        {profile.headToHead.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Head-to-Head Agreement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {profile.headToHead.map((h2h) => {
                  const hConfig = getAgentConfig(h2h.agentId);
                  return (
                    <div key={h2h.agentId} className="text-center">
                      <div
                        className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold"
                        style={{
                          backgroundColor: hConfig?.color || "#888",
                        }}
                      >
                        {h2h.displayName[0]}
                      </div>
                      <p className="text-xs font-medium">{h2h.displayName}</p>
                      <p className="text-lg font-mono font-bold">
                        {Math.round(h2h.agreementPct * 100)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        agreement
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prediction History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Prediction History</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.predictions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No predictions yet.
              </p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>Pick</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Result</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.predictions.map((pred) => (
                      <TableRow key={pred.id}>
                        <TableCell>
                          <Link
                            href={`/matches/${pred.matchId}`}
                            className="hover:underline text-sm"
                          >
                            {pred.match.teamA} vs {pred.match.teamB}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {pred.predictedTeamName}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Math.round(pred.confidence * 100)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {pred.isCorrect === true && (
                            <Check className="w-4 h-4 text-green-600 inline" />
                          )}
                          {pred.isCorrect === false && (
                            <X className="w-4 h-4 text-red-500 inline" />
                          )}
                          {pred.isCorrect === null && (
                            <span className="text-xs text-muted-foreground">
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm ${pnlColorClass(pred.pnl)}`}
                        >
                          {formatPnl(pred.pnl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatStreak(streak: number): string {
  if (streak > 0) return `W${streak}`;
  if (streak < 0) return `L${Math.abs(streak)}`;
  return "-";
}

function formatPnl(pnl: number | null): string {
  if (pnl == null) return "-";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}$${Math.abs(pnl).toFixed(0)}`;
}

function pnlColorClass(pnl: number | null): string {
  if (pnl == null) return "";
  return pnl >= 0 ? "text-emerald-600" : "text-red-600";
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-mono font-bold ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
