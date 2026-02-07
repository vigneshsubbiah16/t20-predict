import { db } from "./index";
import { agents, matches } from "./schema";
import { AGENT_CONFIGS } from "../lib/agents-config";

interface MatchSeed {
  matchNumber: number;
  stage: string;
  groupName: string | null;
  teamA: string;
  teamB: string;
  venue: string;
  scheduledAt: string; // ISO 8601
  espnId?: string;
}

const MATCH_SEEDS: MatchSeed[] = [
  // ========== GROUP A ==========
  { matchNumber: 1, stage: "group", groupName: "A", teamA: "Pakistan", teamB: "Netherlands", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-07T05:30:00Z" },
  { matchNumber: 2, stage: "group", groupName: "A", teamA: "India", teamB: "USA", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-07T13:30:00Z" },
  { matchNumber: 5, stage: "group", groupName: "A", teamA: "Netherlands", teamB: "Namibia", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-02-10T05:30:00Z" },
  { matchNumber: 6, stage: "group", groupName: "A", teamA: "Pakistan", teamB: "USA", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-10T13:30:00Z" },
  { matchNumber: 9, stage: "group", groupName: "A", teamA: "India", teamB: "Namibia", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-02-12T13:30:00Z" },
  { matchNumber: 14, stage: "group", groupName: "A", teamA: "USA", teamB: "Namibia", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-15T09:30:00Z" },
  { matchNumber: 15, stage: "group", groupName: "A", teamA: "India", teamB: "Pakistan", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-15T13:30:00Z" },
  { matchNumber: 19, stage: "group", groupName: "A", teamA: "Pakistan", teamB: "Namibia", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-18T09:30:00Z" },
  { matchNumber: 20, stage: "group", groupName: "A", teamA: "India", teamB: "Netherlands", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-18T13:30:00Z" },

  // ========== GROUP B ==========
  { matchNumber: 3, stage: "group", groupName: "B", teamA: "Sri Lanka", teamB: "Ireland", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-08T13:30:00Z" },
  { matchNumber: 4, stage: "group", groupName: "B", teamA: "Zimbabwe", teamB: "Oman", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-09T09:30:00Z" },
  { matchNumber: 7, stage: "group", groupName: "B", teamA: "Australia", teamB: "Ireland", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-11T09:30:00Z" },
  { matchNumber: 10, stage: "group", groupName: "B", teamA: "Australia", teamB: "Zimbabwe", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-13T05:30:00Z" },
  { matchNumber: 11, stage: "group", groupName: "B", teamA: "Ireland", teamB: "Oman", venue: "Sinhalese Sports Club, Colombo", scheduledAt: "2026-02-14T05:30:00Z" },
  { matchNumber: 16, stage: "group", groupName: "B", teamA: "Australia", teamB: "Sri Lanka", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-16T13:30:00Z" },
  { matchNumber: 17, stage: "group", groupName: "B", teamA: "Ireland", teamB: "Zimbabwe", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-17T09:30:00Z" },
  { matchNumber: 21, stage: "group", groupName: "B", teamA: "Sri Lanka", teamB: "Zimbabwe", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-19T09:30:00Z" },
  { matchNumber: 22, stage: "group", groupName: "B", teamA: "Australia", teamB: "Oman", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-20T13:30:00Z" },

  // ========== GROUP C ==========
  { matchNumber: 3.1, stage: "group", groupName: "C", teamA: "West Indies", teamB: "Scotland", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-02-07T09:30:00Z" },
  { matchNumber: 3.2, stage: "group", groupName: "C", teamA: "England", teamB: "Nepal", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-08T09:30:00Z" },
  { matchNumber: 4.1, stage: "group", groupName: "C", teamA: "Scotland", teamB: "Italy", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-02-09T05:30:00Z" },
  { matchNumber: 8, stage: "group", groupName: "C", teamA: "Nepal", teamB: "Italy", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-12T09:30:00Z" },
  { matchNumber: 12, stage: "group", groupName: "C", teamA: "England", teamB: "Scotland", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-02-14T09:30:00Z" },
  { matchNumber: 13, stage: "group", groupName: "C", teamA: "West Indies", teamB: "Nepal", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-15T05:30:00Z" },
  { matchNumber: 18, stage: "group", groupName: "C", teamA: "England", teamB: "Italy", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-02-16T09:30:00Z" },
  { matchNumber: 23, stage: "group", groupName: "C", teamA: "West Indies", teamB: "Italy", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-02-18T05:30:00Z" },
  { matchNumber: 24, stage: "group", groupName: "C", teamA: "England", teamB: "West Indies", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-19T13:30:00Z" },

  // ========== GROUP D ==========
  { matchNumber: 3.3, stage: "group", groupName: "D", teamA: "New Zealand", teamB: "Afghanistan", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-08T05:30:00Z" },
  { matchNumber: 4.2, stage: "group", groupName: "D", teamA: "South Africa", teamB: "Canada", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-09T13:30:00Z" },
  { matchNumber: 5.1, stage: "group", groupName: "D", teamA: "New Zealand", teamB: "UAE", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-10T09:30:00Z" },
  { matchNumber: 7.1, stage: "group", groupName: "D", teamA: "South Africa", teamB: "Afghanistan", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-11T05:30:00Z" },
  { matchNumber: 10.1, stage: "group", groupName: "D", teamA: "Canada", teamB: "UAE", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-02-13T09:30:00Z" },
  { matchNumber: 11.1, stage: "group", groupName: "D", teamA: "New Zealand", teamB: "South Africa", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-14T13:30:00Z" },
  { matchNumber: 16.1, stage: "group", groupName: "D", teamA: "Afghanistan", teamB: "UAE", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-02-16T05:30:00Z" },
  { matchNumber: 17.1, stage: "group", groupName: "D", teamA: "New Zealand", teamB: "Canada", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-17T05:30:00Z" },
  { matchNumber: 21.1, stage: "group", groupName: "D", teamA: "South Africa", teamB: "UAE", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-02-18T05:30:00Z" },
  { matchNumber: 22.1, stage: "group", groupName: "D", teamA: "Afghanistan", teamB: "Canada", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-19T13:30:00Z" },

  // ========== SUPER 8 ==========
  { matchNumber: 38, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (B2)", teamB: "TBD (D1)", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-21T13:30:00Z" },
  { matchNumber: 39, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (A2)", teamB: "TBD (C1)", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-22T09:30:00Z" },
  { matchNumber: 40, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (A1)", teamB: "TBD (C2)", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-22T13:30:00Z" },
  { matchNumber: 41, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (B1)", teamB: "TBD (D2)", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-02-23T13:30:00Z" },
  { matchNumber: 42, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (A2)", teamB: "TBD (D1)", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-24T13:30:00Z" },
  { matchNumber: 43, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (B2)", teamB: "TBD (C1)", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-25T13:30:00Z" },
  { matchNumber: 44, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (D2)", teamB: "TBD (C2)", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-02-26T09:30:00Z" },
  { matchNumber: 45, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (A1)", teamB: "TBD (B1)", venue: "MA Chidambaram Stadium, Chennai", scheduledAt: "2026-02-26T13:30:00Z" },
  { matchNumber: 46, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (A2)", teamB: "TBD (B2)", venue: "R. Premadasa Stadium, Colombo", scheduledAt: "2026-02-27T13:30:00Z" },
  { matchNumber: 47, stage: "super8", groupName: "Super 8 Group 2", teamA: "TBD (D1)", teamB: "TBD (C1)", venue: "Pallekele International Cricket Stadium, Kandy", scheduledAt: "2026-02-28T13:30:00Z" },
  { matchNumber: 48, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (B1)", teamB: "TBD (C2)", venue: "Arun Jaitley Stadium, Delhi", scheduledAt: "2026-03-01T09:30:00Z" },
  { matchNumber: 49, stage: "super8", groupName: "Super 8 Group 1", teamA: "TBD (A1)", teamB: "TBD (D2)", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-03-01T13:30:00Z" },

  // ========== KNOCKOUTS ==========
  { matchNumber: 50, stage: "semi", groupName: null, teamA: "TBD (S8 G1 Winner)", teamB: "TBD (S8 G2 Runner-up)", venue: "Eden Gardens, Kolkata", scheduledAt: "2026-03-04T13:30:00Z" },
  { matchNumber: 51, stage: "semi", groupName: null, teamA: "TBD (S8 G2 Winner)", teamB: "TBD (S8 G1 Runner-up)", venue: "Wankhede Stadium, Mumbai", scheduledAt: "2026-03-05T13:30:00Z" },
  { matchNumber: 52, stage: "final", groupName: null, teamA: "TBD (SF1 Winner)", teamB: "TBD (SF2 Winner)", venue: "Narendra Modi Stadium, Ahmedabad", scheduledAt: "2026-03-08T13:30:00Z" },
];

export async function seedAgents() {
  console.log("Seeding agents...");
  for (const config of AGENT_CONFIGS) {
    await db
      .insert(agents)
      .values({
        id: config.id,
        displayName: config.displayName,
        provider: config.provider,
        modelId: config.modelId,
        slug: config.slug,
        color: config.color,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${AGENT_CONFIGS.length} agents`);
}

export async function seedMatches() {
  console.log("Seeding matches...");
  let count = 0;
  for (let i = 0; i < MATCH_SEEDS.length; i++) {
    const m = MATCH_SEEDS[i];
    const id = `match-${String(i + 1).padStart(3, "0")}`;
    await db
      .insert(matches)
      .values({
        id,
        matchNumber: Math.floor(m.matchNumber),
        stage: m.stage,
        groupName: m.groupName,
        teamA: m.teamA,
        teamB: m.teamB,
        venue: m.venue,
        scheduledAt: m.scheduledAt,
        status: "upcoming",
      })
      .onConflictDoNothing();
    count++;
  }
  console.log(`Seeded ${count} matches`);
}

export async function seedAll() {
  await seedAgents();
  await seedMatches();
  console.log("Seeding complete!");
}
