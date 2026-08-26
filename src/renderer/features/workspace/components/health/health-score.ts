import { translation } from "@renderer/i18n/translation";
import type { NpmAuditResult, OutdatedPackageInfo } from "@renderer/shared/types/lazify";

type HealthScore = "healthy" | "warning" | "critical" | "unknown";

/**
 * A package is only a problem when what is installed is behind what its own
 * range allows — that is a plain `update` away. A newer major sitting outside
 * the range is a deliberate choice, not a fault, so it never scores.
 */

/**
 * A package is only a problem when what is installed is behind what its own
 * range allows — that is a plain `update` away. A newer major sitting outside
 * the range is a deliberate choice, not a fault, so it never scores.
 */
export function isBehindRange(info: OutdatedPackageInfo) {
	return Boolean(info.current) && info.current !== info.wanted;
}

export function computeScore(behindCount: number, audit: NpmAuditResult | null): HealthScore {
	if (behindCount === 0 && !audit) return "unknown";

	const counts = audit?.metadata?.vulnerabilities;

	// "Critical" means there are critical findings. Anything else that needs
	// attention — highs included — is a warning, so the headline never claims a
	// severity the list below it does not contain.
	if ((counts?.critical ?? 0) > 0) return "critical";

	const needsAttention = behindCount > 0 || (counts?.high ?? 0) > 0 || (counts?.moderate ?? 0) > 0;

	return needsAttention ? "warning" : "healthy";
}

export const SCORE_ICON: Record<HealthScore, "check-circle" | "warning-triangle"> = {
	healthy: "check-circle",
	warning: "warning-triangle",
	critical: "warning-triangle",
	unknown: "check-circle",
};

export const SCORE_STYLES: Record<HealthScore, string> = {
	healthy: "border-accent/25 bg-accent/8 text-accent",
	warning: "border-warning/25 bg-warning/10 text-warning",
	critical: "border-error/25 bg-error/8 text-error",
	unknown: "border-border bg-soft text-muted",
};

export const SCORE_LABEL: Record<HealthScore, string> = {
	healthy: translation.HealthPane.ScoreHealthy,
	warning: translation.HealthPane.ScoreWarning,
	critical: translation.HealthPane.ScoreCritical,
	unknown: translation.HealthPane.ScoreUnknown,
};

// ─── Severity helpers ─────────────────────────────────────────────────────────
