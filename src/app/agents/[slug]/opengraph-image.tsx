import { ImageResponse } from "next/og";
import { getAgentProfileFromDb } from "@/lib/data";

export const runtime = "nodejs";
export const alt = "T20 Predict Agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getAgentProfileFromDb(slug);

  if (!profile) {
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
          Agent Not Found
        </div>
      ),
      { ...size }
    );
  }

  const accuracy =
    profile.stats.totalPredictions > 0
      ? `${Math.round(profile.stats.accuracy * 100)}%`
      : "N/A";
  const pnl = `${profile.stats.totalPnl >= 0 ? "+" : ""}$${Math.abs(profile.stats.totalPnl).toFixed(0)}`;

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
            fontSize: 18,
            color: "#94a3b8",
            marginBottom: 24,
          }}
        >
          T20 Predict
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: profile.color,
            marginBottom: 20,
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          {profile.displayName[0]}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: -1,
            marginBottom: 8,
          }}
        >
          {profile.displayName}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#94a3b8",
            marginBottom: 40,
          }}
        >
          {profile.provider} &middot; {profile.modelId}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 36, fontWeight: 900 }}>
              {profile.stats.points}
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#94a3b8" }}>
              Points
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 36, fontWeight: 900 }}>
              {accuracy}
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#94a3b8" }}>
              Accuracy
            </div>
          </div>
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
                fontSize: 36,
                fontWeight: 900,
                color: profile.stats.totalPnl >= 0 ? "#4ade80" : "#f87171",
              }}
            >
              {pnl}
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#94a3b8" }}>
              P&L
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
