import Anthropic from "@anthropic-ai/sdk";
import { parsePredictionResponse } from "./parse";
import type { AgentResult } from "./orchestrator";

const client = new Anthropic({
  apiKey: process.env.UNBOUND_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.UNBOUND_API_KEY
    ? "https://api.getunbound.ai"
    : undefined,
});

export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  const start = performance.now();

  const response = await client.messages.create({
    model: process.env.UNBOUND_API_KEY ? "anthropic/claude-opus-4-6" : "claude-opus-4-6",
    max_tokens: 16000,
    thinking: { type: "enabled", budget_tokens: 5000 },
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const latencyMs = Math.round(performance.now() - start);

  // Extract search queries from server_tool_use blocks (web search)
  const searchQueries: string[] = [];
  for (const block of response.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const input = block.input as { query?: string };
      if (input.query) {
        searchQueries.push(input.query);
      }
    }
  }

  // Extract the final text response
  let responseText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      responseText += block.text;
    }
  }

  if (!responseText) {
    throw new Error("No text response from Claude");
  }

  const prediction = parsePredictionResponse(responseText, teamA, teamB);
  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return {
    prediction,
    searchQueries,
    rawResponse: responseText,
    tokensUsed,
    latencyMs,
  };
}
