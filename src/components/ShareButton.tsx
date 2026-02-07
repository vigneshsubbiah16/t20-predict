"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check } from "lucide-react";

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

function buildShareText(
  teamA: string,
  teamB: string,
  predictions: ShareMatchButtonProps["predictions"],
  winner: string | null | undefined,
): string {
  if (!predictions || predictions.length === 0) {
    return `${teamA} vs ${teamB} - T20 World Cup 2026. Which AI will predict correctly?`;
  }

  if (winner) {
    const winnerName = winner === "team_a" ? teamA : teamB;
    const correct = predictions.filter((p) => p.predictedWinner === winner).length;
    return `${winnerName} won! ${correct}/${predictions.length} AIs got it right on T20 Predict.`;
  }

  const teamAPicks = predictions.filter((p) => p.predictedWinner === "team_a").length;
  const teamBPicks = predictions.length - teamAPicks;

  if (teamAPicks === teamBPicks) {
    return `${teamA} vs ${teamB}: AIs are split ${teamAPicks}-${teamBPicks}! Who will be right?`;
  }

  const favorite = teamAPicks > teamBPicks ? teamA : teamB;
  const majorityCount = Math.max(teamAPicks, teamBPicks);
  const minorityPick = teamAPicks < teamBPicks ? "team_a" : "team_b";
  const dissenters = majorityCount === 3
    ? predictions.filter((p) => p.predictedWinner === minorityPick)
    : [];

  if (dissenters.length === 1) {
    const underdog = teamAPicks > teamBPicks ? teamB : teamA;
    return `${majorityCount}/${predictions.length} AIs pick ${favorite} vs ${underdog}. The dissenter? Check it out.`;
  }

  return `${majorityCount}/${predictions.length} AIs pick ${favorite}. Do you agree?`;
}

export function ShareMatchButton({
  matchId,
  teamA,
  teamB,
  predictions = [],
  winner,
}: ShareMatchButtonProps) {
  const [copied, setCopied] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);

  useEffect(() => {
    setSupportsNativeShare(!!navigator.share);
  }, []);

  const url = `${window.location.origin}/matches/${matchId}`;
  const text = buildShareText(teamA, teamB, predictions, winner);

  function shareToTwitter(): void {
    const tweetText = encodeURIComponent(`${text}\n\n${url}`);
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareToWhatsApp(): void {
    const waText = encodeURIComponent(`${text}\n\n${url}`);
    window.open(
      `https://api.whatsapp.com/send?text=${waText}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  async function shareNative(): Promise<void> {
    try {
      await navigator.share({
        title: `${teamA} vs ${teamB} - T20 Predict`,
        text,
        url,
      });
    } catch {
      // user cancelled or not supported
    }
  }

  if (supportsNativeShare) {
    return (
      <Button onClick={shareNative} variant="outline" size="sm">
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button onClick={shareToTwitter} variant="outline" size="sm">
        X
      </Button>
      <Button onClick={shareToWhatsApp} variant="outline" size="sm">
        WhatsApp
      </Button>
      <Button onClick={copyLink} variant="outline" size="sm">
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-1" />
            Copied!
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4 mr-1" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
