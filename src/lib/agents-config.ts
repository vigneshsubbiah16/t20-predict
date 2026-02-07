export interface AgentConfig {
  id: string;
  displayName: string;
  provider: string;
  modelId: string;
  slug: string;
  color: string; // hex
  tailwindColor: string;
  tailwindBg: string;
  tailwindBorder: string;
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: "claude-opus",
    displayName: "Claude Opus 4.6",
    provider: "anthropic",
    modelId: "claude-opus-4-6",
    slug: "claude",
    color: "#E87040",
    tailwindColor: "text-orange-600",
    tailwindBg: "bg-orange-50",
    tailwindBorder: "border-orange-200",
  },
  {
    id: "gpt-5",
    displayName: "GPT-5.2",
    provider: "openai",
    modelId: "gpt-5.2",
    slug: "gpt",
    color: "#10A37F",
    tailwindColor: "text-emerald-600",
    tailwindBg: "bg-emerald-50",
    tailwindBorder: "border-emerald-200",
  },
  {
    id: "gemini-3",
    displayName: "Gemini 3 Pro",
    provider: "google",
    modelId: "gemini-3.0-pro",
    slug: "gemini",
    color: "#4285F4",
    tailwindColor: "text-blue-600",
    tailwindBg: "bg-blue-50",
    tailwindBorder: "border-blue-200",
  },
  {
    id: "grok",
    displayName: "Grok 4",
    provider: "xai",
    modelId: "grok-4",
    slug: "grok",
    color: "#8B5CF6",
    tailwindColor: "text-purple-600",
    tailwindBg: "bg-purple-50",
    tailwindBorder: "border-purple-200",
  },
];

export function getAgentConfig(idOrSlug: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
}
