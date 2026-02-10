"use client";

import { useState } from "react";
import Link from "next/link";
import type { Prediction } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronUp, Search, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAgentConfig } from "@/lib/agents-config";

interface PredictionBattleProps {
  predictions: Prediction[];
  teamA: string;
  teamB: string;
  winner?: string | null;
}

function getNarrativeBadge(
  predictions: Prediction[],
  teamA: string,
  teamB: string,
  winner?: string | null,
): React.ReactNode {
  if (predictions.length === 0) return null;

  const teamAPicks = predictions.filter(
    (p) => p.predictedWinner === "team_a"
  ).length;
  const teamBPicks = predictions.length - teamAPicks;
  const total = predictions.length;

  // Check if all agents got it wrong
  if (winner != null) {
    const allWrong = predictions.every((p) => p.predictedWinner !== winner);
    if (allWrong && total > 1) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
          <AlertTriangle className="w-3 h-3" />
          All {total} AIs got this wrong
        </Badge>
      );
    }
  }

  // Unanimous
  if (teamAPicks === total || teamBPicks === total) {
    const pickedTeam = teamAPicks === total ? teamA : teamB;
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
        <Users className="w-3 h-3" />
        Unanimous: {pickedTeam}
      </Badge>
    );
  }

  // Split decision
  if (total >= 3) {
    const majority = Math.max(teamAPicks, teamBPicks);
    const minority = Math.min(teamAPicks, teamBPicks);
    if (majority === minority) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
          Split Decision ({teamAPicks}-{teamBPicks})
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100/60 text-amber-700 border-amber-200 gap-1">
        {majority}-{minority} Split
      </Badge>
    );
  }

  return null;
}

export function PredictionBattle({
  predictions,
  teamA,
  teamB,
  winner,
}: PredictionBattleProps) {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);

  const teamAPicks = predictions.filter(
    (p) => p.predictedWinner === "team_a"
  ).length;
  const teamBPicks = predictions.length - teamAPicks;
  const totalPicks = predictions.length;

  const narrativeBadge = getNarrativeBadge(predictions, teamA, teamB, winner);

  return (
    <div className="space-y-4">
      {/* Narrative badge */}
      {narrativeBadge && (
        <div className="animate-fade-in-up">{narrativeBadge}</div>
      )}

      {/* Consensus bar */}
      {totalPicks > 0 && (
        <div className="space-y-2 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{teamA}</span>
            <span>{teamB}</span>
          </div>
          <div className="flex h-8 rounded-full overflow-hidden border">
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500 overflow-hidden"
              style={{
                width: `${(teamAPicks / totalPicks) * 100}%`,
                minWidth: teamAPicks > 0 ? "3rem" : "0",
              }}
            >
              <span className="truncate px-1">{teamA} {teamAPicks}</span>
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500 overflow-hidden"
              style={{
                width: `${(teamBPicks / totalPicks) * 100}%`,
                minWidth: teamBPicks > 0 ? "3rem" : "0",
              }}
            >
              <span className="truncate px-1">{teamB} {teamBPicks}</span>
            </div>
          </div>
        </div>
      )}

      {/* Prediction cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((prediction, index) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            teamA={teamA}
            teamB={teamB}
            winner={winner}
            index={index}
          />
        ))}
      </div>

      {predictions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No predictions yet. Check back closer to match time.
        </div>
      )}
    </div>
  );
}

function PredictionCard({
  prediction,
  teamA,
  teamB,
  winner,
  index,
}: {
  prediction: Prediction;
  teamA: string;
  teamB: string;
  winner?: string | null;
  index: number;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const config = getAgentConfig(prediction.agentId);
  const pickedTeam =
    prediction.predictedWinner === "team_a" ? teamA : teamB;
  const isCorrect =
    winner != null ? prediction.predictedWinner === winner : null;

  let searchQueries: string[] = [];
  if (prediction.searchQueries) {
    try {
      searchQueries = JSON.parse(prediction.searchQueries);
    } catch {
      // malformed JSON — fall back to empty array
    }
  }

  // Stagger class based on card position (cap at 4)
  const staggerClass = `stagger-${Math.min(index + 1, 4)}`;

  return (
    <div
      className={cn(
        "prediction-card relative rounded-xl border-2 overflow-hidden animate-card-enter",
        staggerClass,
        config?.tailwindBg || "bg-gray-50",
        config?.tailwindBorder || "border-gray-200",
        isCorrect === true && "ring-2 ring-green-500 ring-offset-2",
        isCorrect === false && "opacity-60"
      )}
    >
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: config?.color }} />
      <div className="p-4">
      {/* Result badge */}
      {isCorrect !== null && (
        <div
          className={cn(
            "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center",
            isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}
        >
          {isCorrect ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </div>
      )}

      {/* Agent name */}
      <Link
        href={`/agents/${config?.slug || prediction.agentId}`}
        className={cn(
          "font-bold text-sm mb-2 block hover:underline",
          config?.tailwindColor || "text-gray-600"
        )}
      >
        {config?.displayName || prediction.agentId}
      </Link>

      {/* Prediction */}
      <div className="text-center mb-2">
        <div className="text-lg font-bold truncate">{pickedTeam}</div>
        <div className="text-2xl font-black font-mono">
          {Math.round(prediction.confidence * 100)}%
        </div>
      </div>

      {/* P&L */}
      {prediction.pnl != null && (
        <div
          className={cn(
            "text-center font-mono font-bold text-sm",
            prediction.pnl >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {prediction.pnl >= 0 ? "+" : ""}${prediction.pnl.toFixed(0)}
        </div>
      )}

      {/* Reasoning */}
      {prediction.reasoning && (
        <div className="mt-2">
          <p
            className={cn(
              "text-xs text-muted-foreground",
              !reasoningExpanded && "line-clamp-3"
            )}
          >
            {prediction.reasoning}
          </p>
          <button
            onClick={() => setReasoningExpanded(!reasoningExpanded)}
            className="text-xs font-medium text-primary hover:underline mt-1"
          >
            {reasoningExpanded ? "Show less" : "Read more"}
          </button>
        </div>
      )}

      {/* Search queries */}
      {searchQueries.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 w-full rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">
              {showSearch ? "Hide research" : `Researched ${searchQueries.length} topics`}
            </span>
            {showSearch ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
          {showSearch && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {searchQueries.map((q, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
