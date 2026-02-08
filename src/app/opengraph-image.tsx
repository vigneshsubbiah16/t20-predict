import { ImageResponse } from "next/og";
import { getLeaderboardFromDb } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "T20 Predict - AI Prediction Battle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let leaderName = "TBD";
  try {
    const entries = await getLeaderboardFromDb();
    if (entries.length > 0) {
      leaderName = entries[0].displayName;
    }
  } catch {
    // fallback
  }

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
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #f97316, #3b82f6, #8b5cf6)",
            marginBottom: 24,
            fontSize: 32,
            fontWeight: 900,
          }}
        >
          AI
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: -2,
            marginBottom: 12,
          }}
        >
          T20 Predict
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 40,
          }}
        >
          4 AIs Battle to Predict Cricket
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 32px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.1)",
            fontSize: 22,
          }}
        >
          Current Leader: {leaderName}
        </div>
      </div>
    ),
    { ...size }
  );
}
