import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "T20 World Cup 2026 - AI Prediction Battle",
  description:
    "4 frontier AI models compete to predict T20 World Cup 2026 match winners. Track accuracy, P&L, and calibration on the leaderboard.",
  openGraph: {
    title: "T20 World Cup 2026 - AI Prediction Battle",
    description:
      "Claude vs GPT vs Gemini vs Grok. Which AI best predicts cricket?",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-sm">AI</span>
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight leading-none">
                    T20 Predict
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    AI vs AI — World Cup 2026
                  </p>
                </div>
              </Link>
              <NavLinks />
            </div>
          </div>
        </header>

        {children}

        {/* Footer */}
        <footer className="border-t mt-12 bg-slate-50">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">T20 Predict</p>
                <p className="text-xs mt-0.5">
                  ICC Men&apos;s T20 World Cup 2026 &middot; Feb 7 – Mar 8, 2026 &middot; India & Sri Lanka
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/matches" className="hover:text-foreground">
                  All Matches
                </Link>
                <Link href="/compare" className="hover:text-foreground">
                  Compare
                </Link>
                <Link href="/agents" className="hover:text-foreground">
                  Agents
                </Link>
                <Link href="/how-it-works" className="hover:text-foreground">
                  How It Works
                </Link>
              </div>
            </div>
            <div className="border-t pt-4 text-xs text-muted-foreground text-center space-y-1">
              <p>
                Predictions by Claude Opus 4.6, GPT-5.2, Gemini 3 Pro & Grok 4
              </p>
              <p>
                For entertainment purposes only. AI predictions are experimental.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
