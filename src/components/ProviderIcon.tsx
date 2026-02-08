import { SiAnthropic, SiOpenai, SiGooglegemini, SiX } from "@icons-pack/react-simple-icons";

interface ProviderIconProps {
  provider: string;
  size?: number;
  color?: string;
  className?: string;
}

const PROVIDER_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  anthropic: SiAnthropic,
  openai: SiOpenai,
  google: SiGooglegemini,
  xai: SiX,
};

export function ProviderIcon({ provider, size = 20, color, className = "" }: ProviderIconProps) {
  const Icon = PROVIDER_ICONS[provider.toLowerCase()];
  if (!Icon) return null;

  return (
    <span className={className}>
      <Icon size={size} color={color ?? "currentColor"} />
    </span>
  );
}
