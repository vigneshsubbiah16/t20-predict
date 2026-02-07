import type { InferSelectModel } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { predictions, predictionLogs, matches, agents } from "@/db/schema";
import type { AgentConfig } from "@/lib/agents-config";
import { buildPredictionPrompt } from "./prompt";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";
import { callGoogle } from "./google";
import { callXAI } from "./xai";
import type { ParsedPrediction } from "./parse";

type Match = InferSelectModel<typeof matches>;
type Agent = InferSelectModel<typeof agents>;

export interface AgentResult {
  prediction: ParsedPrediction;
  searchQueries: string[];
  rawResponse: string;
  tokensUsed: number;
  latencyMs: number;
}

interface OrchestrationResult {
  agentId: string;
  status: "success" | "error";
  predictionId?: string;
  error?: string;
}

const TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 5_000;

type CallerFn = (
  system: string,
  user: string,
  teamA: string,
  teamB: string,
) => Promise<AgentResult>;

const CALLERS: Record<string, CallerFn> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  google: callGoogle,
  xai: callXAI,
};

/**
 * Run predictions for a match across all specified agents in parallel.
 * Each agent gets a 60s timeout and 1 retry on failure.
 */
export async function orchestratePredictions(
  match: Match,
  agentConfigs: AgentConfig[],
): Promise<OrchestrationResult[]> {
  const { system, user } = buildPredictionPrompt(match);
  const predictionWindow = match.playingXiA ? "post_xi" : "pre_match";

  const tasks = agentConfigs.map((agent) =>
    runAgentWithRetry(agent, system, user, match, predictionWindow),
  );

  return Promise.all(tasks);
}

async function runAgentWithRetry(
  agent: AgentConfig,
  system: string,
  user: string,
  match: Match,
  predictionWindow: string,
): Promise<OrchestrationResult> {
  try {
    return await callAgentWithTimeout(agent, system, user, match, predictionWindow);
  } catch (firstError) {
    console.warn(`[${agent.id}] First attempt failed: ${String(firstError)}. Retrying in ${RETRY_DELAY_MS}ms...`);
    await sleep(RETRY_DELAY_MS);
    try {
      return await callAgentWithTimeout(agent, system, user, match, predictionWindow);
    } catch (retryError) {
      return await storeFailure(agent, match, predictionWindow, system, retryError);
    }
  }
}

async function callAgentWithTimeout(
  agent: AgentConfig,
  system: string,
  user: string,
  match: Match,
  predictionWindow: string,
): Promise<OrchestrationResult> {
  const caller = CALLERS[agent.provider];
  if (!caller) {
    throw new Error(`No caller registered for provider: ${agent.provider}`);
  }

  const result = await withTimeout(
    caller(system, user, match.teamA, match.teamB),
    TIMEOUT_MS,
  );

  return await storeSuccess(agent, match, predictionWindow, system, result);
}

async function storeSuccess(
  agent: AgentConfig,
  match: Match,
  predictionWindow: string,
  prompt: string,
  result: AgentResult,
): Promise<OrchestrationResult> {
  const predictionId = crypto.randomUUID();
  const logId = crypto.randomUUID();
  const now = new Date().toISOString();

  const predictedWinner =
    result.prediction.winner === match.teamA ? "team_a" : "team_b";

  // Mark previous predictions for this agent+match as not latest
  await db
    .update(predictions)
    .set({ isLatest: false })
    .where(
      and(
        eq(predictions.matchId, match.id),
        eq(predictions.agentId, agent.id),
      ),
    );

  await db.insert(predictions).values({
    id: predictionId,
    matchId: match.id,
    agentId: agent.id,
    predictedWinner,
    predictedTeamName: result.prediction.winner,
    confidence: result.prediction.confidence,
    reasoning: result.prediction.reasoning,
    predictionWindow,
    isLatest: true,
    searchQueries: JSON.stringify(result.searchQueries),
    createdAt: now,
  });

  await db.insert(predictionLogs).values({
    id: logId,
    predictionId,
    rawPrompt: prompt,
    rawResponse: result.rawResponse,
    tokensUsed: result.tokensUsed,
    latencyMs: result.latencyMs,
    createdAt: now,
  });

  console.log(
    `[${agent.id}] Predicted ${result.prediction.winner} (${result.prediction.confidence}) in ${result.latencyMs}ms`,
  );

  return { agentId: agent.id, status: "success", predictionId };
}

async function storeFailure(
  agent: AgentConfig,
  match: Match,
  predictionWindow: string,
  prompt: string,
  error: unknown,
): Promise<OrchestrationResult> {
  const logId = crypto.randomUUID();
  const now = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Store a prediction_log with no prediction_id to record the failure
  await db.insert(predictionLogs).values({
    id: logId,
    predictionId: null,
    rawPrompt: prompt,
    rawResponse: null,
    tokensUsed: null,
    latencyMs: null,
    createdAt: now,
  });

  console.error(`[${agent.id}] Failed for match ${match.id}: ${errorMessage}`);

  return { agentId: agent.id, status: "error", error: errorMessage };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call a single agent for a single match.
 * Adapts a DB agent row into the shape the orchestrator expects.
 * Used by the cron and admin trigger routes.
 */
export async function callAgent(
  match: Match,
  agent: Agent,
): Promise<OrchestrationResult> {
  const config: AgentConfig = {
    id: agent.id,
    displayName: agent.displayName,
    provider: agent.provider,
    modelId: agent.modelId,
    slug: agent.slug,
    color: agent.color,
    tailwindColor: "",
    tailwindBg: "",
    tailwindBorder: "",
  };

  const { system, user } = buildPredictionPrompt(match);
  const predictionWindow = match.playingXiA ? "post_xi" : "pre_match";

  return runAgentWithRetry(config, system, user, match, predictionWindow);
}
