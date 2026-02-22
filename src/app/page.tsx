export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LocalDateTime } from "@/components/LocalDateTime";
import { AgentRankCards } from "@/components/AgentRankCards";
import type { LeaderboardEntry } from "@/lib/api";
import { getLeaderboardFromDb, getMatchesFromDb, getRecentPredictionsFromDb, getSeasonStatsFromDb, getUpsetMatchIds } from "@/lib/data";
import { generateNarrativeHeadline } from "@/lib/narrative";
import { formatMatchLabel } from "@/lib/utils";

async function HeroSection() {
  try {
    // Check for live matches first, then fall back to upcoming
    const [liveMatches, upcomingMatches] = await Promise.all([
      getMatchesFromDb({ status: "live" }),
      getMatchesFromDb({ status: "upcoming" }),
    ]);

    const isLive = liveMatches.length > 0;
    const heroMatch = liveMatches[0] || upcomingMatches[0];
    if (!heroMatch) return null;

    return (
      <Link href={`/matches/${heroMatch.id}`}>
        <Card className={`border-2 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer animate-fade-in-up ${isLive ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200" : "bg-gradient-to-r from-blue-50 to-amber-50"}`}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                {isLive ? (
                  <Badge variant="secondary" className="mb-2 bg-red-100 text-red-700 border-red-200 animate-pulse">
                    <Target className="w-3 h-3 mr-1" />
                    LIVE
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mb-2 bg-orange-100 text-orange-700 border-orange-200">
                    <Target className="w-3 h-3 mr-1" />
                    NEXT MATCH
                  </Badge>
                )}
                <h2 className="text-2xl font-black">
                  {heroMatch.teamA} vs {heroMatch.teamB}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatMatchLabel(heroMatch.stage, heroMatch.groupName)} &middot;{" "}
                  {heroMatch.venue}
                </p>
              </div>
              <div className="text-right">
                <CountdownTimer targetDate={heroMatch.scheduledAt} />
                <p className="text-xs text-muted-foreground mt-1">
                  <LocalDateTime dateString={heroMatch.scheduledAt} format="date-only" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  } catch {
    return null;
  }
}

async function ActivityFeed() {
  try {
    const items = await getRecentPredictionsFromDb(8);

    return (
      <Card className="h-full animate-fade-in-up stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Predictions will appear here once the tournament starts.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/matches/${item.matchId}`}
                  className="flex items-start gap-2 text-sm hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: item.agentColor }}
                  />
                  <div>
                    <span className="font-medium">{item.agentName}</span> picked{" "}
                    <span className="font-semibold">{item.predictedTeamName}</span>{" "}
                    ({Math.round(item.confidence * 100)}%)
                    <div className="text-xs text-muted-foreground">
                      {item.teamA} vs {item.teamB} &middot;{" "}
                      <LocalDateTime dateString={item.createdAt} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  } catch {
    return null;
  }
}

async function RecentResults() {
  try {
    const allMatches = await getMatchesFromDb({ status: "completed" });
    const recent = allMatches.slice(0, 5);
    if (recent.length === 0) return null;

    // Single batch query for upset detection instead of N+1
    const upsetIds = await getUpsetMatchIds(recent.map((m) => m.id));

    return (
      <Card className="h-full animate-fade-in-up stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {m.teamA} vs {m.teamB}
                {upsetIds.has(m.id) && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                )}
              </span>
              <span className="font-medium text-emerald-600">
                {m.winnerTeamName}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    );
  } catch {
    return null;
  }
}

async function SeasonStats() {
  try {
    const stats = await getSeasonStatsFromDb();
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Matches</span>
              <span className="font-mono font-semibold">
                {stats.completedMatches}/{stats.totalMatches}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Predictions</span>
              <span className="font-mono font-semibold">{stats.totalPredictions}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch {
    return null;
  }
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await getLeaderboardFromDb();
  } catch {
    return [];
  }
}

export default async function Home() {
  const entries = await fetchLeaderboard();
  const { headline, subline } = generateNarrativeHeadline(entries);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Hero - Next Match */}
        <section className="mb-8">
          <Suspense
            fallback={
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground animate-pulse">
                  Loading next match...
                </CardContent>
              </Card>
            }
          >
            <HeroSection />
          </Suspense>
        </section>

        {/* Narrative Headline */}
        <section className="mb-8">
          <h2 className="text-3xl font-black tracking-tight">{headline}</h2>
          <p className="text-lg text-muted-foreground mt-1">{subline}</p>
        </section>

        {/* Agent Rank Cards */}
        <section className="mb-10">
          <AgentRankCards entries={entries} />
        </section>

        {/* Activity + Results side by side */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Suspense fallback={null}>
            <ActivityFeed />
          </Suspense>
          <Suspense fallback={null}>
            <RecentResults />
          </Suspense>
        </div>

        {/* Season Stats bar */}
        <Suspense fallback={null}>
          <SeasonStats />
        </Suspense>
      </div>
    </main>
  );
}
