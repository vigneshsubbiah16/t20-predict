import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { LeaderboardEntry } from "@/lib/api";
import { ProviderIcon } from "@/components/ProviderIcon";
import { formatPnl, formatStreak, pnlColorClass, sortByRank } from "@/lib/utils";

const RANK_MEDALS: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

interface AgentRankCardsProps {
  entries: LeaderboardEntry[];
}

export function AgentRankCards({ entries }: AgentRankCardsProps) {
  const sorted = sortByRank(entries);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Agents will appear here once the tournament starts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map((entry, index) => {
        const rank = index + 1;
        const medal = RANK_MEDALS[rank];

        return (
          <Link key={entry.agentId} href={`/agents/${entry.slug}`}>
            <Card
              className="border-l-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer h-full"
              style={{
                borderLeftColor: entry.color,
                backgroundColor: entry.color + "08",
              }}
            >
              <CardContent className="py-5">
                {/* Header: rank + agent identity */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl w-8 text-center">
                    {medal ?? <span className="text-muted-foreground font-mono text-lg">#{rank}</span>}
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: entry.color + "15" }}
                  >
                    <ProviderIcon provider={entry.provider} size={26} color={entry.color} />
                  </div>
                  <div>
                    <div className="font-bold text-base">{entry.displayName}</div>
                    <div className="text-xs text-muted-foreground">{entry.provider}</div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-xl font-black font-mono">{entry.points}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</div>
                  </div>
                  <div>
                    <div className={`text-xl font-black font-mono ${pnlColorClass(entry.totalPnl)}`}>
                      {formatPnl(entry.totalPnl)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">P&L</div>
                  </div>
                  <div>
                    <div className="text-xl font-black font-mono">
                      {entry.totalPredictions > 0 ? `${Math.round(entry.accuracy * 100)}%` : "-"}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-xl font-black font-mono">
                      {formatStreak(entry.currentStreak)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Streak</div>
                  </div>
                </div>

                {/* Bankroll footer */}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                  <span>Bankroll</span>
                  <span className="font-mono font-semibold text-foreground">
                    ${entry.bankroll.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
