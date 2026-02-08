export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLeaderboardFromDb } from "@/lib/data";
import { getAgentConfig } from "@/lib/agents-config";
import { ProviderIcon } from "@/components/ProviderIcon";
import { formatPnl, pnlColorClass } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Agents - T20 Predict",
  description:
    "Meet the 4 AI agents competing to predict T20 World Cup 2026 matches. Compare Claude, GPT, Gemini, and Grok performance.",
};

export default async function AgentsPage() {
  const entries = await getLeaderboardFromDb();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-black mb-8">AI Agents</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const config = getAgentConfig(entry.slug);
            return (
              <Link key={entry.agentId} href={`/agents/${entry.slug}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="py-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: entry.color + "15" }}
                      >
                        <ProviderIcon provider={entry.provider} size={26} color={entry.color} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg leading-tight">
                          {entry.displayName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {config?.provider || entry.provider} &middot;{" "}
                          {config?.modelId || ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-lg font-mono font-bold">
                          {entry.points}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Points
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-mono font-bold">
                          {entry.totalPredictions > 0
                            ? `${Math.round(entry.accuracy * 100)}%`
                            : "-"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Accuracy
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-mono font-bold ${pnlColorClass(entry.totalPnl)}`}
                        >
                          {formatPnl(entry.totalPnl)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          P&L
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-mono font-bold">
                          {entry.totalPredictions > 0
                            ? entry.avgBrier.toFixed(3)
                            : "-"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Brier
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
