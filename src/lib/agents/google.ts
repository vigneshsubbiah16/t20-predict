import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { parsePredictionResponse } from "./parse";
import type { AgentResult } from "./orchestrator";

export async function callGoogle(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  // If Unbound API key is available, route through gateway using OpenAI-compatible format
  if (process.env.UNBOUND_API_KEY) {
    return callGoogleViaUnbound(systemPrompt, userPrompt, teamA, teamB);
  }
  return callGoogleDirect(systemPrompt, userPrompt, teamA, teamB);
}

async function callGoogleViaUnbound(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  const client = new OpenAI({
    apiKey: process.env.UNBOUND_API_KEY,
    baseURL: "https://api.getunbound.ai/v1",
  });

  const start = performance.now();

  // Use OpenAI-compatible chat completions with googleSearch grounding tool
  const response = await client.chat.completions.create({
    model: "google/gemini-3-pro-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 8000,
    // @ts-expect-error - googleSearch is a valid tool type for Gemini via Unbound gateway
    tools: [{ googleSearch: {} }],
  });

  const latencyMs = Math.round(performance.now() - start);
  const responseText = response.choices?.[0]?.message?.content || "";

  if (!responseText) {
    throw new Error("No text response from Gemini 3 Pro");
  }

  // Extract search queries from grounding metadata if available
  const searchQueries: string[] = [];
  const rawResponse = JSON.stringify(response);
  const groundingMatch = rawResponse.match(/"webSearchQueries"\s*:\s*(\[[^\]]*\])/);
  if (groundingMatch) {
    try {
      const queries = JSON.parse(groundingMatch[1]);
      if (Array.isArray(queries)) {
        searchQueries.push(...queries.filter((q: unknown) => typeof q === "string"));
      }
    } catch {
      // ignore parsing errors
    }
  }

  const prediction = parsePredictionResponse(responseText, teamA, teamB);
  const tokensUsed =
    (response.usage?.prompt_tokens ?? 0) +
    (response.usage?.completion_tokens ?? 0);

  return {
    prediction,
    searchQueries,
    rawResponse: responseText,
    tokensUsed,
    latencyMs,
  };
}

async function callGoogleDirect(
  systemPrompt: string,
  userPrompt: string,
  teamA: string,
  teamB: string,
): Promise<AgentResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
  const start = performance.now();

  const response = await ai.models.generateContent({
    model: "gemini-3.0-pro",
    contents: [
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 5000 },
    },
  });

  const latencyMs = Math.round(performance.now() - start);

  const searchQueries: string[] = [];
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  if (groundingMetadata) {
    const searchQueriesFromMetadata = groundingMetadata.webSearchQueries;
    if (searchQueriesFromMetadata) {
      searchQueries.push(...searchQueriesFromMetadata);
    }
  }

  const responseText = response.text ?? "";
  if (!responseText) {
    throw new Error("No text response from Gemini 3 Pro");
  }

  const prediction = parsePredictionResponse(responseText, teamA, teamB);
  const tokensUsed =
    (response.usageMetadata?.promptTokenCount ?? 0) +
    (response.usageMetadata?.candidatesTokenCount ?? 0);

  return {
    prediction,
    searchQueries,
    rawResponse: responseText,
    tokensUsed,
    latencyMs,
  };
}
