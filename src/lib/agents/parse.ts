export interface ParsedPrediction {
  winner: string;
  confidence: number;
  reasoning: string;
}

/**
 * Parse an AI model's response text into a structured prediction.
 * Tries JSON.parse, code block extraction, and regex fallback.
 * Validates winner against the two team names and clamps confidence.
 */
export function parsePredictionResponse(
  responseText: string,
  teamA: string,
  teamB: string,
): ParsedPrediction {
  const raw = extractJson(responseText);
  if (!raw) {
    throw new Error(`Could not extract JSON from response: ${responseText.slice(0, 200)}`);
  }

  const winner = validateWinner(raw.winner, teamA, teamB);
  const confidence = clampConfidence(raw.confidence);
  const reasoning = typeof raw.reasoning === "string" ? raw.reasoning : "";

  return { winner, confidence, reasoning };
}

function extractJson(text: string): Record<string, unknown> | null {
  // Attempt 1: direct JSON.parse
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // continue
  }

  // Attempt 2: extract from ```json code blocks (complete or incomplete)
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)(?:```|$)/);
  if (codeBlockMatch) {
    const block = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(block);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Try to repair truncated JSON from code block
      const repaired = repairJson(block);
      if (repaired) return repaired;
    }
  }

  // Attempt 3: find any JSON object in the text containing "winner"
  const jsonObjectMatch = text.match(/\{[^{}]*"winner"[^{}]*\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // continue
    }
  }

  // Attempt 4: regex for { "winner": ..., "confidence": ..., "reasoning": ... }
  const regexMatch = text.match(
    /\{\s*"winner"\s*:\s*"([^"]+)"\s*,\s*"confidence"\s*:\s*([\d.]+)\s*,\s*"reasoning"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/
  );
  if (regexMatch) {
    return {
      winner: regexMatch[1],
      confidence: parseFloat(regexMatch[2]),
      reasoning: regexMatch[3].replace(/\\"/g, '"').replace(/\\n/g, "\n"),
    };
  }

  // Attempt 5: extract individual fields with flexible regex
  const winnerMatch = text.match(/"winner"\s*:\s*"([^"]+)"/);
  const confMatch = text.match(/"confidence"\s*:\s*([\d.]+)/);
  if (winnerMatch && confMatch) {
    const reasonMatch = text.match(/"reasoning"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    return {
      winner: winnerMatch[1],
      confidence: parseFloat(confMatch[1]),
      reasoning: reasonMatch ? reasonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : "",
    };
  }

  return null;
}

function repairJson(text: string): Record<string, unknown> | null {
  // Try to extract fields from incomplete JSON
  const winnerMatch = text.match(/"winner"\s*:\s*"([^"]+)"/);
  const confMatch = text.match(/"confidence"\s*:\s*([\d.]+)/);
  if (winnerMatch && confMatch) {
    const reasonMatch = text.match(/"reasoning"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    return {
      winner: winnerMatch[1],
      confidence: parseFloat(confMatch[1]),
      reasoning: reasonMatch ? reasonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : "",
    };
  }
  return null;
}

function validateWinner(winner: unknown, teamA: string, teamB: string): string {
  if (typeof winner !== "string") {
    throw new Error(`Invalid winner value: ${String(winner)}`);
  }

  const normalized = winner.trim().toLowerCase();
  if (normalized === teamA.toLowerCase()) return teamA;
  if (normalized === teamB.toLowerCase()) return teamB;

  // Partial match fallback (e.g. "India" matches "India")
  if (teamA.toLowerCase().includes(normalized) || normalized.includes(teamA.toLowerCase())) {
    return teamA;
  }
  if (teamB.toLowerCase().includes(normalized) || normalized.includes(teamB.toLowerCase())) {
    return teamB;
  }

  throw new Error(`Winner "${winner}" does not match either team: "${teamA}" or "${teamB}"`);
}

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) {
    throw new Error(`Invalid confidence value: ${String(value)}`);
  }
  return Math.min(1.0, Math.max(0.5, num));
}
