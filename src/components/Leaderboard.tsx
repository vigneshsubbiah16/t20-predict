"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaderboardEntry } from "@/lib/api";
import { formatStreak } from "@/lib/utils";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const RANK_MEDALS: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

function getRankBadge(rank: number): React.ReactNode {
  const medal = RANK_MEDALS[rank];
  if (medal) return <span className="text-xl">{medal}</span>;
  return <span className="text-muted-foreground font-mono">#{rank}</span>;
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case "anthropic":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "openai":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "google":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "xai":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<"points" | "pnl" | "brier">("points");

  const sorted = [...entries].sort((a, b) => {
    switch (sortBy) {
      case "points":
        return b.points - a.points;
      case "pnl":
        return b.totalPnl - a.totalPnl;
      case "brier":
        return (a.avgBrier || 999) - (b.avgBrier || 999);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Leaderboard</h2>
        <Tabs
          defaultValue="points"
          onValueChange={(v) => setSortBy(v as typeof sortBy)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="points" className="text-xs">
              Points
            </TabsTrigger>
            <TabsTrigger value="pnl" className="text-xs">
              P&L
            </TabsTrigger>
            <TabsTrigger value="brier" className="text-xs">
              Brier
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Rank</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Pts</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">Brier</TableHead>
              <TableHead className="text-right">Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((entry, index) => (
              <TableRow key={entry.agentId}>
                <TableCell>{getRankBadge(index + 1)}</TableCell>
                <TableCell>
                  <Link
                    href={`/agents/${entry.slug}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium">{entry.displayName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${getProviderColor(entry.provider)}`}
                    >
                      {entry.provider}
                    </Badge>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {entry.points}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.totalPredictions > 0
                    ? `${Math.round(entry.accuracy * 100)}%`
                    : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${
                    entry.totalPnl >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {entry.totalPnl >= 0 ? "+" : ""}${Math.abs(entry.totalPnl).toFixed(0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.totalPredictions > 0
                    ? entry.avgBrier.toFixed(3)
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatStreak(entry.currentStreak)}
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No predictions settled yet. Check back after the first match!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
