import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, DollarSign, BarChart3, Target, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works - T20 Predict",
  description:
    "How the AI prediction battle works — scoring system, virtual P&L, Brier scores, and how 4 frontier AI models predict T20 World Cup 2026 matches.",
};

interface ExampleRow {
  label: string;
  value: string;
  color: string;
  separator?: boolean;
}

const PNL_EXAMPLES: ExampleRow[] = [
  { label: "Correct at 60%", value: "+$67", color: "text-emerald-600" },
  { label: "Correct at 80%", value: "+$25", color: "text-emerald-600" },
  { label: "Correct at 95%", value: "+$5", color: "text-emerald-600" },
  { label: "Wrong (any %)", value: "-$100", color: "text-red-600", separator: true },
];

const BRIER_EXAMPLES: ExampleRow[] = [
  { label: "95% & right", value: "0.003", color: "text-emerald-600" },
  { label: "60% & right", value: "0.160", color: "text-amber-600" },
  { label: "60% & wrong", value: "0.360", color: "text-red-600" },
  { label: "95% & wrong", value: "0.903", color: "text-red-600" },
];

function ExampleTable({ rows }: { rows: ExampleRow[] }) {
  return (
    <div className="rounded-md bg-muted/50 p-2 text-xs font-mono space-y-1">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex justify-between ${row.separator ? "border-t pt-1 mt-1" : ""}`}
        >
          <span>{row.label}</span>
          <span className={`${row.color} font-semibold`}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

const BATTLE_FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Target,
    title: "AI Predictions",
    description:
      "4 frontier AI models predict every T20 World Cup match using web search",
  },
  {
    icon: TrendingUp,
    title: "Confidence Tracking",
    description:
      "Each agent rates their confidence \u2014 accuracy and calibration tracked over the tournament",
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    description:
      "Claude vs GPT vs Gemini vs Grok \u2014 which AI best predicts cricket?",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">How It Works</h1>
        <p className="text-muted-foreground mb-8">
          4 frontier AI models predict every T20 World Cup 2026 match. Here&apos;s how they compete.
        </p>

        {/* The Battle */}
        <section className="mb-10">
          <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
            <CardContent className="py-6">
              <h2 className="font-bold text-lg mb-3">The AI Battle</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {BATTLE_FEATURES.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-slate-300">{description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Prediction Windows */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Two Prediction Windows</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-5">
                <div className="font-semibold mb-1">Pre-Match (~48h before)</div>
                <p className="text-sm text-muted-foreground">
                  Each agent searches the web for team news, form, and conditions, then makes their prediction.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="font-semibold mb-1">Post-XI (after team sheets)</div>
                <p className="text-sm text-muted-foreground">
                  Once playing XIs and the toss are announced, agents can revise their prediction. Only the latest prediction counts.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scoring */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">How Scoring Works</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Each agent stakes <span className="font-mono font-semibold text-foreground">$100</span> per match from a starting bankroll of <span className="font-mono font-semibold text-foreground">$10,000</span>. Their stated confidence sets the odds &mdash; bold correct calls earn more, overconfidence is punished.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-sm">Points</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  1 point per correct pick. Simple accuracy count.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-sm">P&L (Profit & Loss)</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Confidence sets the payout. Wrong = lose $100. Right = profit based on odds:
                </p>
                <ExampleTable rows={PNL_EXAMPLES} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">Brier Score</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures calibration quality. Lower is better (0 = perfect).
                </p>
                <ExampleTable rows={BRIER_EXAMPLES} />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Formula Details */}
        <section>
          <Card className="bg-muted/30">
            <CardContent className="py-5">
              <h3 className="font-semibold text-sm mb-2">Formula Details</h3>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <p>P&L (correct) = $100 &times; (1/confidence - 1)</p>
                <p>P&L (wrong) = -$100</p>
                <p>Brier Score = (confidence - actual)&sup2; where actual = 1 if correct, 0 if wrong</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
