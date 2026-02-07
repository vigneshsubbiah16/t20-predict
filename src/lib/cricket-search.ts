import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.UNBOUND_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.UNBOUND_API_KEY
    ? "https://api.getunbound.ai"
    : undefined,
});

const MODEL = process.env.UNBOUND_API_KEY
  ? "anthropic/claude-sonnet-4-5-20250929"
  : "claude-sonnet-4-5-20250929";

interface MatchResultSearch {
  completed: boolean;
  winner: string | null;
  resultSummary: string | null;
}

interface TeamNewsSearch {
  tossOccurred: boolean;
  tossWinner: string | null;
  tossDecision: string | null;
  playingXiA: string[] | null;
  playingXiB: string[] | null;
}

export async function searchMatchResult(
  teamA: string,
  teamB: string,
  scheduledAt: string,
): Promise<MatchResultSearch | null> {
  try {
    const matchDate = new Date(scheduledAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Search for the result of the T20 World Cup 2026 cricket match: ${teamA} vs ${teamB} scheduled on ${matchDate}.

Is this match completed? If yes, who won and what was the result?

Respond ONLY with JSON: { "completed": true/false, "winner": "Team Name" or null, "resultSummary": "Team won by X runs/wickets" or null }`,
        },
      ],
    });

    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    const jsonMatch = responseText.match(/\{[\s\S]*"completed"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      completed: Boolean(parsed.completed),
      winner: parsed.winner || null,
      resultSummary: parsed.resultSummary || null,
    };
  } catch (err) {
    console.error(`AI result search failed for ${teamA} vs ${teamB}:`, err);
    return null;
  }
}

export async function searchTeamNews(
  teamA: string,
  teamB: string,
  scheduledAt: string,
): Promise<TeamNewsSearch | null> {
  try {
    const matchDate = new Date(scheduledAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Search for the latest team news for the T20 World Cup 2026 match: ${teamA} vs ${teamB} on ${matchDate}.

Has the toss occurred? If so, who won and what did they choose?
Have the playing XIs been announced? If so, list the 11 players for each team.

Respond ONLY with JSON:
{
  "tossOccurred": true/false,
  "tossWinner": "Team Name" or null,
  "tossDecision": "bat" or "bowl" or null,
  "playingXiA": ["Player1", ...] or null,
  "playingXiB": ["Player1", ...] or null
}

playingXiA is for ${teamA}, playingXiB is for ${teamB}. Only include XI arrays if you found the actual confirmed 11 players (exactly 11 names each).`,
        },
      ],
    });

    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    const jsonMatch = responseText.match(/\{[\s\S]*"tossOccurred"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      tossOccurred: Boolean(parsed.tossOccurred),
      tossWinner: parsed.tossWinner || null,
      tossDecision: parsed.tossDecision || null,
      playingXiA: Array.isArray(parsed.playingXiA) ? parsed.playingXiA : null,
      playingXiB: Array.isArray(parsed.playingXiB) ? parsed.playingXiB : null,
    };
  } catch (err) {
    console.error(`AI team news search failed for ${teamA} vs ${teamB}:`, err);
    return null;
  }
}
