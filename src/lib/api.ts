// Types matching the API responses

export interface Agent {
  id: string;
  displayName: string;
  provider: string;
  modelId: string;
  slug: string;
  color: string;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface Match {
  id: string;
  matchNumber: number;
  stage: string;
  groupName: string | null;
  teamA: string;
  teamB: string;
  venue: string;
  scheduledAt: string;
  status: string;
  winner: string | null;
  winnerTeamName: string | null;
  resultSummary: string | null;
  playingXiA: string | null;
  playingXiB: string | null;
  xiAnnouncedAt: string | null;
  tossWinner: string | null;
  tossDecision: string | null;
  espnId: string | null;
  predictionCount?: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  agentId: string;
  predictedWinner: string;
  predictedTeamName: string;
  confidence: number;
  reasoning: string | null;
  predictionWindow: string;
  isLatest: boolean;
  searchQueries: string | null;
  searchSummary: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  pnl: number | null;
  brierScore: number | null;
  createdAt: string;
  agent?: Agent;
}

export interface MatchWithPredictions extends Match {
  predictions: Prediction[];
}

export interface LeaderboardEntry {
  agentId: string;
  displayName: string;
  slug: string;
  color: string;
  provider: string;
  points: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  totalPnl: number;
  bankroll: number;
  avgBrier: number;
  currentStreak: number;
  bestStreak: number;
}

export interface AgentProfile extends Agent {
  stats: {
    points: number;
    totalPnl: number;
    bankroll: number;
    avgBrier: number;
    accuracy: number;
    totalPredictions: number;
    correctPredictions: number;
    currentStreak: number;
    bestStreak: number;
  };
  predictions: Array<Prediction & { match: Match }>;
  headToHead: Array<{ agentId: string; displayName: string; agreementPct: number }>;
  insights: string[];
}

export interface ActivityItem {
  id: string;
  agentName: string;
  agentSlug: string;
  agentColor: string;
  teamA: string;
  teamB: string;
  matchId: string;
  predictedTeamName: string;
  confidence: number;
  createdAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getMatches(params?: {
  status?: string;
  stage?: string;
}): Promise<Match[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.stage) sp.set("stage", params.stage);
  const q = sp.toString();
  return fetchApi<Match[]>(`/api/matches${q ? `?${q}` : ""}`);
}

export async function getMatch(id: string): Promise<MatchWithPredictions> {
  return fetchApi<MatchWithPredictions>(`/api/matches/${id}`);
}

export async function getLeaderboard(sort?: string): Promise<LeaderboardEntry[]> {
  const q = sort ? `?sort=${sort}` : "";
  return fetchApi<LeaderboardEntry[]>(`/api/leaderboard${q}`);
}

export async function getAgents(): Promise<Agent[]> {
  return fetchApi<Agent[]>("/api/agents");
}

export async function getAgentProfile(slug: string): Promise<AgentProfile> {
  return fetchApi<AgentProfile>(`/api/agents/${slug}`);
}

export async function getRecentPredictions(limit = 20): Promise<ActivityItem[]> {
  return fetchApi<ActivityItem[]>(`/api/predictions?limit=${limit}`);
}
