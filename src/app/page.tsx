export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaderboard } from "@/components/Leaderboard";
import { Target, TrendingUp, Trophy } from "lucide-react";
import { getLeaderboardFromDb, getMatchesFromDb, getRecentPredictionsFromDb } from "@/lib/data";

async function HeroSection() {
  try {
    const matches = await getMatchesFromDb({ status: "upcoming" });
    const nextMatch = matches[0];
    if (!nextMatch) return null;

    const matchDate = new Date(nextMatch.scheduledAt);
    const now = new Date();
    const hoursUntil = Math.max(
      0,
      Math.floor((matchDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    );

    return (
      <Link href={`/matches/${nextMatch.id}`}>
        <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer bg-gradient-to-r from-blue-50 to-amber-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary" className="mb-2 bg-orange-100 text-orange-700 border-orange-200">
                  <Target className="w-3 h-3 mr-1" />
                  NEXT MATCH
                </Badge>
                <h2 className="text-2xl font-black">
                  {nextMatch.teamA} vs {nextMatch.teamB}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Match #{nextMatch.matchNumber} &middot;{" "}
                  {nextMatch.stage === "group"
                    ? `Group ${nextMatch.groupName}`
                    : nextMatch.stage}{" "}
                  &middot; {nextMatch.venue}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black font-mono text-primary">
                  {hoursUntil > 0 ? `${hoursUntil}h` : "LIVE"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {matchDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
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

async function LeaderboardSection() {
  try {
    const entries = await getLeaderboardFromDb();
    return <Leaderboard entries={entries} />;
  } catch {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Leaderboard will appear after the first match is settled.
        </CardContent>
      </Card>
    );
  }
}

async function ActivityFeed() {
  try {
    const items = await getRecentPredictionsFromDb(10);
    if (items.length === 0) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Predictions will appear here once the tournament starts.
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/matches/${item.matchId}`}
              className="flex items-start gap-2 text-sm hover:bg-muted/50 rounded p-1 -mx-1"
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
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
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

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1 -mx-1"
            >
              <span>
                {m.teamA} vs {m.teamB}
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

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
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

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            <Suspense
              fallback={
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground animate-pulse">
                    Loading leaderboard...
                  </CardContent>
                </Card>
              }
            >
              <LeaderboardSection />
            </Suspense>

            {/* How it works */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
              <CardContent className="py-6">
                <h3 className="font-bold text-lg mb-3">How It Works</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">AI Predictions</div>
                      <div className="text-slate-300">
                        4 frontier AI models predict every T20 World Cup match
                        using web search
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Virtual P&L</div>
                      <div className="text-slate-300">
                        $100 stake per prediction, $10K starting bankroll,
                        tracked with Brier scores
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Leaderboard</div>
                      <div className="text-slate-300">
                        Claude vs GPT vs Gemini vs Grok — which AI best predicts
                        cricket?
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Suspense fallback={null}>
              <ActivityFeed />
            </Suspense>
            <Suspense fallback={null}>
              <RecentResults />
            </Suspense>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Season Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Starting Bankroll
                  </span>
                  <span className="font-mono font-semibold">$10,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stake per Bet</span>
                  <span className="font-mono font-semibold">$100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Models</span>
                  <span className="font-mono font-semibold">4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tournament</span>
                  <span className="font-semibold">T20 WC 2026</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
