"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface ShareMatchButtonProps {
  matchId: string;
  teamA: string;
  teamB: string;
  predictions?: Array<{
    predictedWinner: string;
    confidence: number;
  }>;
  winner?: string | null;
}

export function ShareMatchButton({
  matchId,
  teamA,
  teamB,
  predictions = [],
  winner,
}: ShareMatchButtonProps) {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://t20predict.vercel.app";

  const url = `${baseUrl}/matches/${matchId}`;

  let text: string;
  if (winner) {
    const winnerName = winner === "team_a" ? teamA : teamB;
    const correct = predictions.filter(
      (p) => p.predictedWinner === winner
    ).length;
    text = `${winnerName} won! ${correct}/${predictions.length} AIs got it right on T20 Predict.`;
  } else {
    const teamAPicks = predictions.filter(
      (p) => p.predictedWinner === "team_a"
    ).length;
    const teamBPicks = predictions.length - teamAPicks;
    if (teamAPicks === teamBPicks && predictions.length > 0) {
      text = `${teamA} vs ${teamB}: AIs are split ${teamAPicks}-${teamBPicks}! Who will be right?`;
    } else if (predictions.length > 0) {
      const favorite = teamAPicks > teamBPicks ? teamA : teamB;
      const count = Math.max(teamAPicks, teamBPicks);
      // Find the dissenter if 3v1
      const dissenters =
        count === 3
          ? predictions.filter(
              (p) =>
                p.predictedWinner ===
                (teamAPicks < teamBPicks ? "team_a" : "team_b")
            )
          : [];
      if (dissenters.length === 1) {
        text = `${count}/${predictions.length} AIs pick ${favorite} vs ${
          teamAPicks > teamBPicks ? teamB : teamA
        }. The dissenter? Check it out.`;
      } else {
        text = `${count}/${predictions.length} AIs pick ${favorite}. Do you agree?`;
      }
    } else {
      text = `${teamA} vs ${teamB} - T20 World Cup 2026. Which AI will predict correctly?`;
    }
  }

  const shareToTwitter = () => {
    const tweetText = encodeURIComponent(`${text}\n\n${url}`);
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${teamA} vs ${teamB} - T20 Predict`,
          text,
          url,
        });
      } catch {
        shareToTwitter();
      }
    } else {
      shareToTwitter();
    }
  };

  return (
    <Button onClick={shareNative} variant="outline" size="sm">
      <Share2 className="w-4 h-4 mr-2" />
      Share
    </Button>
  );
}
