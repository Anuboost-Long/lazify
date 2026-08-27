import { useResolvedTheme } from "@renderer/shared/hooks/use-theme";
import { schemeIsStale } from "@renderer/shared/terminal";

/**
 * Whether a session is still painting for the theme it started in.
 *
 * Reads through the app's theme so the answer changes the moment someone
 * switches: an agent that asked about the background once, and cannot be told
 * it has changed, is out of step until it is started again.
 */
export function useSchemeStale(runId: string | null | undefined): boolean {
	const theme = useResolvedTheme();

	return Boolean(runId) && schemeIsStale(runId as string, theme);
}
