/** Presentation helpers shared across the dashboard. */

export const pct = (value: number): string => `${Math.round(value * 100)}%`;

/** Vitals ramp. Kept in one place so every surface reads a score identically. */
export function vitalTone(score: number): "good" | "warn" | "bad" | "dead" {
  if (score <= 0) return "dead";
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

export const TONE_HEX: Record<ReturnType<typeof vitalTone>, string> = {
  good: "#34d399",
  warn: "#fbbf24",
  bad: "#f87171",
  dead: "#64748b",
};

export function severityLabel(severity: string): string {
  switch (severity) {
    case "healthy": return "nominal";
    case "degraded": return "degraded";
    case "critical": return "critical";
    case "schema_gap": return "schema gap";
    default: return "no data";
  }
}

export function relativeTime(iso?: string): string {
  if (!iso) return "never";
  const deltaSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (deltaSec < 5) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}
