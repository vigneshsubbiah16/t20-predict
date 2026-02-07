import OpenAI from "openai";
import { parsePredictionResponse } from "./parse";
import type { AgentResult } from "./orchestrator";

const client = new OpenAI({
  apiKey: process.env.UNBOUND_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.UNBOUND_API_KEY
    ? "https://api.getunbound.ai/v1"
    : undefined,
});

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  const start = performance.now();

  const response = await client.responses.create({
    model: process.env.UNBOUND_API_KEY ? "openai/gpt-5.2" : "gpt-5.2",
    instructions: systemPrompt,
    input: userPrompt,
    reasoning: { effort: "medium" },
    tools: [{ type: "web_search_preview" }],
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
    throw new Error("No text response from GPT-5.2");
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
