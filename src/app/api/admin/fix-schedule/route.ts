import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * One-time admin endpoint to fix the match schedule.
 *
 * Issues fixed:
 * 1. match-027 (ENG vs WI) — date changed from Feb 19 to Feb 11
 * 2. match-026 (WI vs Italy) — date changed from Feb 18 to Feb 19
 * 3. Three missing group matches added (USA vs NED, SL vs OMA, SCO vs NEP)
 * 4. Match numbers corrected to match ICC official numbering
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates: string[] = [];

    // Fix match-027: England vs West Indies — was Feb 19, should be Feb 11
    await db
      .update(matches)
      .set({ scheduledAt: "2026-02-11T13:30:00Z", matchNumber: 15 })
      .where(eq(matches.id, "match-027"));
    updates.push("match-027 (ENG vs WI): Feb 19 → Feb 11");

    // Fix match-026: West Indies vs Italy — was Feb 18, should be Feb 19
    await db
      .update(matches)
      .set({ scheduledAt: "2026-02-19T05:30:00Z", matchNumber: 37 })
      .where(eq(matches.id, "match-026"));
    updates.push("match-026 (WI vs Italy): Feb 18 → Feb 19");

    // Add 3 missing group matches
    const missingMatches = [
      {
        id: "match-053",
        matchNumber: 21,
        stage: "group",
        groupName: "A",
        teamA: "USA",
        teamB: "Netherlands",
        venue: "MA Chidambaram Stadium, Chennai",
        scheduledAt: "2026-02-13T09:30:00Z",
        status: "upcoming",
      },
      {
        id: "match-054",
        matchNumber: 16,
        stage: "group",
        groupName: "B",
        teamA: "Sri Lanka",
        teamB: "Oman",
        venue: "Pallekele International Cricket Stadium, Kandy",
        scheduledAt: "2026-02-12T05:30:00Z",
        status: "upcoming",
      },
      {
        id: "match-055",
        matchNumber: 33,
        stage: "group",
        groupName: "C",
        teamA: "Scotland",
        teamB: "Nepal",
        venue: "Wankhede Stadium, Mumbai",
        scheduledAt: "2026-02-17T05:30:00Z",
        status: "upcoming",
      },
    ];

    for (const m of missingMatches) {
      await db.insert(matches).values(m).onConflictDoNothing();
      updates.push(`Added ${m.id} (${m.teamA} vs ${m.teamB}, ${m.scheduledAt.slice(0, 10)})`);
    }

    // Update match numbers for existing matches to match ICC official numbering
    const matchNumberFixes: Record<string, number> = {
      "match-001": 1,   // PAK vs NED
      "match-002": 3,   // IND vs USA
      "match-003": 10,  // NED vs NAM
      "match-004": 12,  // PAK vs USA
      "match-005": 18,  // IND vs NAM
      "match-006": 26,  // USA vs NAM
      "match-007": 27,  // IND vs PAK
      "match-008": 35,  // PAK vs NAM
      "match-009": 36,  // IND vs NED
      "match-010": 6,   // SL vs IRE
      "match-011": 8,   // ZIM vs OMA
      "match-012": 14,  // AUS vs IRE
      "match-013": 19,  // AUS vs ZIM
      "match-014": 22,  // IRE vs OMA
      "match-015": 30,  // AUS vs SL
      "match-016": 32,  // IRE vs ZIM
      "match-017": 38,  // SL vs ZIM
      "match-018": 40,  // AUS vs OMA
      "match-019": 2,   // WI vs SCO
      "match-020": 5,   // ENG vs NEP
      "match-021": 7,   // SCO vs ITA
      "match-022": 17,  // NEP vs ITA
      "match-023": 23,  // ENG vs SCO
      "match-024": 25,  // WI vs NEP
      "match-025": 29,  // ENG vs ITA
      "match-028": 4,   // NZ vs AFG
      "match-029": 9,   // SA vs CAN
      "match-030": 11,  // NZ vs UAE
      "match-031": 13,  // SA vs AFG
      "match-032": 20,  // CAN vs UAE
      "match-033": 24,  // NZ vs SA
      "match-034": 28,  // AFG vs UAE
      "match-035": 31,  // NZ vs CAN
      "match-036": 34,  // SA vs UAE
      "match-037": 39,  // AFG vs CAN
    };

    for (const [matchId, matchNum] of Object.entries(matchNumberFixes)) {
      await db
        .update(matches)
        .set({ matchNumber: matchNum })
        .where(eq(matches.id, matchId));
    }
    updates.push(`Updated match numbers for ${Object.keys(matchNumberFixes).length} matches`);

    return NextResponse.json({
      success: true,
      updates,
    });
  } catch (error) {
    console.error("Fix schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
