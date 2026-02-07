import OpenAI from "openai";
import { parsePredictionResponse } from "./parse";
import type { AgentResult } from "./orchestrator";

export async function callXAI(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  const client = new OpenAI({
    apiKey: process.env.UNBOUND_API_KEY || process.env.XAI_API_KEY,
    baseURL: process.env.UNBOUND_API_KEY
      ? "https://api.getunbound.ai/v1"
      : "https://api.x.ai/v1",
  });

  const start = performance.now();

  // Use Responses API with web search for both gateway and direct
  const response = await client.responses.create({
    model: process.env.UNBOUND_API_KEY ? "x-ai/grok-4" : "grok-4",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: "medium" },
    tools: [{ type: "web_search" }],
  });

  const latencyMs = Math.round(performance.now() - start);

  // Extract search queries from web_search_call output items
  const searchQueries: string[] = [];
  let responseText = "";

  for (const item of response.output) {
    if (item.type === "web_search_call") {
      if ("query" in item && typeof item.query === "string") {
        searchQueries.push(item.query);
      }
    }
    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "output_text") {
          responseText += part.text;
        }
      }
    }
  }

  if (!responseText) {
    throw new Error("No text response from Grok");
  }

  const prediction = parsePredictionResponse(responseText, teamA, teamB);
  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return {
    prediction,
    searchQueries,
    rawResponse: responseText,
    tokensUsed,
    latencyMs,
  };
}
