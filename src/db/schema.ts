import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  provider: text("provider").notNull(), // anthropic, openai, google, xai
  modelId: text("model_id").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull(), // hex color
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const matches = sqliteTable("matches", {
  id: text("id").primaryKey(),
  matchNumber: integer("match_number").notNull(),
  stage: text("stage").notNull(), // group, super8, semi, final
  groupName: text("group_name"),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  venue: text("venue").notNull(),
  scheduledAt: text("scheduled_at").notNull(), // ISO 8601
  status: text("status").notNull().default("upcoming"), // upcoming, live, completed, abandoned
  winner: text("winner"), // "team_a" or "team_b"
  winnerTeamName: text("winner_team_name"),
  resultSummary: text("result_summary"),
  playingXiA: text("playing_xi_a"), // JSON array
  playingXiB: text("playing_xi_b"), // JSON array
  xiAnnouncedAt: text("xi_announced_at"),
  tossWinner: text("toss_winner"), // team name
  tossDecision: text("toss_decision"), // bat or bowl
  espnId: text("espn_id"),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull().references(() => matches.id),
  agentId: text("agent_id").notNull().references(() => agents.id),
  predictedWinner: text("predicted_winner").notNull(), // "team_a" or "team_b"
  predictedTeamName: text("predicted_team_name").notNull(),
  confidence: real("confidence").notNull(), // 0.5-1.0
  reasoning: text("reasoning"),
  predictionWindow: text("prediction_window").notNull(), // "pre_match" or "post_xi"
  isLatest: integer("is_latest", { mode: "boolean" }).notNull().default(true),
  searchQueries: text("search_queries"), // JSON array of search queries
  searchSummary: text("search_summary"),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  pointsAwarded: integer("points_awarded"),
  pnl: real("pnl"),
  brierScore: real("brier_score"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});

export const predictionLogs = sqliteTable("prediction_logs", {
  id: text("id").primaryKey(),
  predictionId: text("prediction_id").references(() => predictions.id),
  rawPrompt: text("raw_prompt"),
  rawResponse: text("raw_response"),
  tokensUsed: integer("tokens_used"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  createdAt: text("created_at").notNull(),
});
