export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchFromDb } from "@/lib/data";
import { PredictionBattle } from "@/components/PredictionBattle";
import { ShareMatchButton } from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
import { LocalDateTime } from "@/components/LocalDateTime";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchFromDb(id);
  if (!match) return { title: "Match Not Found - T20 Predict" };

  const latestPreds = match.predictions.filter((p) => p.isLatest);
  let description: string;
  if (match.status === "completed" && match.winnerTeamName) {
    const correct = latestPreds.filter((p) => p.predictedWinner === match.winner).length;
    description = `${match.winnerTeamName} won! ${correct}/${latestPreds.length} AIs predicted correctly.`;
  } else if (latestPreds.length > 0) {
    const teamAPicks = latestPreds.filter((p) => p.predictedWinner === "team_a").length;
    const teamBPicks = latestPreds.length - teamAPicks;
    description = `AI vote split: ${match.teamA} ${teamAPicks} - ${teamBPicks} ${match.teamB}. See full analysis.`;
  } else {
    description = `AI predictions for ${match.teamA} vs ${match.teamB} in the T20 World Cup 2026.`;
  }

  return {
    title: `${match.teamA} vs ${match.teamB} - T20 Predict`,
    description,
    openGraph: {
      title: `${match.teamA} vs ${match.teamB} - T20 Predict`,
      description,
    },
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchFromDb(id);
  if (!match) notFound();
  const latestPredictions = match.predictions.filter((p) => p.isLatest);
  const priorPredictions = match.predictions.filter((p) => !p.isLatest);

  // Parse playing XI
  const xiA: string[] = match.playingXiA
    ? JSON.parse(match.playingXiA)
    : [];
  const xiB: string[] = match.playingXiB
    ? JSON.parse(match.playingXiB)
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {match.stage === "group"
                ? `Group ${match.groupName}`
                : match.stage}
            </Badge>
            <Badge variant="outline">Match #{match.matchNumber}</Badge>
            {match.status === "completed" && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Completed
              </Badge>
            )}
            {match.status === "abandoned" && (
              <Badge variant="secondary">Abandoned</Badge>
            )}
          </div>
          <h1 className="text-3xl font-black mb-2">
            {match.teamA} vs {match.teamB}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <LocalDateTime dateString={match.scheduledAt} format="long" />
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {match.venue}
            </span>
          </div>
        </div>

        {/* Result */}
        {match.status === "completed" && match.winnerTeamName && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50 animate-fade-in-up stagger-1">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">
                    Winner
                  </p>
                  <p className="text-xl font-black text-emerald-700">
                    {match.winnerTeamName}
                  </p>
                  {match.resultSummary && (
                    <p className="text-sm text-emerald-600 mt-1">
                      {match.resultSummary}
                    </p>
                  )}
                </div>
                <ShareMatchButton
                  matchId={match.id}
                  teamA={match.teamA}
                  teamB={match.teamB}
                  predictions={latestPredictions}
                  winner={match.winner}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toss info */}
        {match.tossWinner && (
          <Card className="mb-6 animate-fade-in-up stagger-2">
            <CardContent className="py-3 text-sm">
              <span className="font-medium">{match.tossWinner}</span> won the
              toss and chose to{" "}
              <span className="font-medium">{match.tossDecision}</span>
            </CardContent>
          </Card>
        )}

        {/* Prediction Battle */}
        <section className="mb-8 animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">AI Predictions</h2>
            {!match.winner && latestPredictions.length > 0 && (
              <ShareMatchButton
                matchId={match.id}
                teamA={match.teamA}
                teamB={match.teamB}
                predictions={latestPredictions}
              />
            )}
          </div>
          <PredictionBattle
            predictions={latestPredictions}
            teamA={match.teamA}
            teamB={match.teamB}
            winner={match.winner}
          />
        </section>

        {/* Prior predictions (if post_xi replaced pre_match) */}
        {priorPredictions.length > 0 && (
          <section className="mb-8 animate-fade-in-up stagger-4">
            <h2 className="text-lg font-bold mb-3 text-muted-foreground">
              Pre-Match Predictions (before XI announcement)
            </h2>
            <PredictionBattle
              predictions={priorPredictions}
              teamA={match.teamA}
              teamB={match.teamB}
              winner={match.winner}
            />
          </section>
        )}

        {/* Playing XI */}
        {(xiA.length > 0 || xiB.length > 0) && (
          <section className="mb-8 animate-fade-in-up stagger-5">
            <h2 className="text-lg font-bold mb-3">Playing XI</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {xiA.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{match.teamA}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      {xiA.map((player, i) => (
                        <li key={i}>{player}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
              {xiB.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{match.teamB}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      {xiB.map((player, i) => (
                        <li key={i}>{player}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
