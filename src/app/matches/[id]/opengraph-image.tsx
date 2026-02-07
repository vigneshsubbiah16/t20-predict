import { ImageResponse } from "next/og";
import { getMatchFromDb } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "T20 Predict Match";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchFromDb(id);

  if (!match) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#0f172a",
            color: "white",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          Match Not Found
        </div>
      ),
      { ...size }
    );
  }

  const latestPreds = match.predictions.filter((p) => p.isLatest);
  const teamAPicks = latestPreds.filter((p) => p.predictedWinner === "team_a").length;
  const teamBPicks = latestPreds.length - teamAPicks;
  const isCompleted = match.status === "completed";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#94a3b8",
            marginBottom: 16,
          }}
        >
          T20 World Cup 2026 - Match #{match.matchNumber}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            {match.teamA}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#64748b",
              padding: "0 24px",
            }}
          >
            vs
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            {match.teamB}
          </div>
        </div>

        {isCompleted && match.winnerTeamName ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                color: "#4ade80",
                marginBottom: 8,
              }}
            >
              WINNER
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 900,
                color: "#4ade80",
              }}
            >
              {match.winnerTeamName}
            </div>
          </div>
        ) : latestPreds.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 32px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.1)",
              fontSize: 24,
            }}
          >
            AI Vote: {match.teamA} {teamAPicks} - {teamBPicks} {match.teamB}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
