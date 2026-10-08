
export function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function formatReset(resetsAt: string | null): string | null {
  if (!resetsAt) return null;

  const minutes = Math.floor((Date.parse(resetsAt) - Date.now()) / 60_000);

  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;

  if (minutes < 48 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }

  const days = Math.floor(minutes / (24 * 60));
  const restHours = Math.floor((minutes % (24 * 60)) / 60);

  return restHours === 0 ? `${days}d` : `${days}d ${restHours}h`;
}

export const STALE_READING_MS = 10 * 60_000;

export function barToneClass(remainingPercent: number): string {
  if (remainingPercent <= 10) return "bg-rose-400";
  if (remainingPercent <= 30) return "bg-amber-400";
  return "bg-accent";
}

export function remainingOf(usedPercent: number | null): number | null {
  if (usedPercent === null) return null;

  return Math.min(Math.max(100 - usedPercent, 0), 100);
}
