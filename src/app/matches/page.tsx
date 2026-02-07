export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMatchesFromDb } from "@/lib/data";
import { LocalDateTime } from "@/components/LocalDateTime";

export default async function MatchesPage() {
  const allMatches = await getMatchesFromDb();

  // Group by stage
  const stages = [
    { key: "group", label: "Group Stage" },
    { key: "super8", label: "Super 8" },
    { key: "semi", label: "Semi-Finals" },
    { key: "final", label: "Final" },
  ];

  // Within group stage, group by groupName
  const groupStageMatches = allMatches.filter((m) => m.stage === "group");
  const groups = ["A", "B", "C", "D"];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-8">All Matches</h1>

        {/* Group Stage */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Group Stage</h2>
          {groups.map((group) => {
            const groupMatches = groupStageMatches.filter(
              (m) => m.groupName === group
            );
            if (groupMatches.length === 0) return null;
            return (
              <div key={group} className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Group {group}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Other stages */}
        {stages.slice(1).map((stage) => {
          const stageMatches = allMatches.filter(
            (m) => m.stage === stage.key
          );
          if (stageMatches.length === 0) return null;
          return (
            <section key={stage.key} className="mb-10">
              <h2 className="text-xl font-bold mb-4">{stage.label}</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {stageMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function MatchCard({
  match,
}: {
  match: Awaited<ReturnType<typeof getMatchesFromDb>>[0];
}) {
  const isCompleted = match.status === "completed";
  const isAbandoned = match.status === "abandoned";

  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              #{match.matchNumber} &middot;{" "}
              <LocalDateTime dateString={match.scheduledAt} format="date-only" />
            </span>
            {isCompleted && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                Completed
              </Badge>
            )}
            {isAbandoned && (
              <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">
                Abandoned
              </Badge>
            )}
            {match.status === "upcoming" && (
              <Badge variant="outline" className="text-[10px]">
                Upcoming
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">
                {match.teamA} vs {match.teamB}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                {match.venue}
              </p>
            </div>
          </div>
          {isCompleted && match.winnerTeamName && (
            <p className="text-xs font-medium text-emerald-600 mt-2">
              Winner: {match.winnerTeamName}
            </p>
          )}
          {(match.predictionCount ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {match.predictionCount} predictions
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
