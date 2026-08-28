import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";

interface EnvSummaryBarProps {
	/** The file being shown, or null when the project has none. */
	selected: string | null;
	enabledCount: number;
	disabledCount: number;
	revealed: boolean;
	loading: boolean;
	onToggleReveal: () => void;
	onRefresh: () => void;
	onAdd: () => void;
}

/** Which file is open, how much is in it, and the three things to do to it. */
export function EnvSummaryBar({
	selected,
	enabledCount,
	disabledCount,
	revealed,
	loading,
	onToggleReveal,
	onRefresh,
	onAdd,
}: Readonly<EnvSummaryBarProps>) {
	const { t } = useTranslation();

	if (!selected) {
		return (
			<div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
				<SmallText as="span" className="!text-muted truncate">
					{t(translation.EnvPane.NoFiles)}
				</SmallText>
			</div>
		);
	}

	const summary =
		disabledCount > 0
			? t(translation.EnvPane.SummaryWithDisabled, {
					count: enabledCount,
					disabled: disabledCount,
				})
			: t(translation.EnvPane.Summary, { count: enabledCount });
	const reveal = revealed ? t(translation.EnvPane.HideValues) : t(translation.EnvPane.ShowValues);

	return (
		<div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
			<MonoText
				as="span"
				className="!text-text shrink-0 rounded bg-text/[0.06] px-1.5 py-px text-[11px]"
			>
				{selected}
			</MonoText>

			<CaptionText tone="muted" className="min-w-0 flex-1 truncate">
				{summary}
			</CaptionText>

			<IconButton
				icon={revealed ? "shield-check" : "shield-off"}
				title={reveal}
				aria-label={reveal}
				onClick={onToggleReveal}
			/>
			<IconButton
				icon="refresh-circle"
				title={t(translation.GlobalTerm.Refresh)}
				aria-label={t(translation.GlobalTerm.Refresh)}
				iconClassName={loading ? "animate-spin" : undefined}
				onClick={onRefresh}
			/>
			<IconButton
				icon="plus"
				title={t(translation.EnvPane.AddVariable)}
				aria-label={t(translation.EnvPane.AddVariable)}
				onClick={onAdd}
				className="text-accent"
			/>
		</div>
	);
}
