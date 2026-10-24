import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface AgentMonitorSlotProps {
	/** The first open place: labelled outright, where the rest of the wall only outlines its room. */
	invite: boolean;
	onAdd: () => void;
}

export function AgentMonitorSlot({ invite, onAdd }: Readonly<AgentMonitorSlotProps>) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			data-tour={invite ? "monitor-slot" : undefined}
			onClick={onAdd}
			aria-label={t(translation.Agents.MonitorAddPanel)}
			className={clsx(
				"group flex h-full flex-col items-center justify-center gap-2 rounded-xl",
				"border border-dashed",
				invite ? "border-border" : "border-border/60",
				"text-sm font-medium text-muted",
				"transition-colors duration-150 hover:border-accent/50 hover:text-accent",
				"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
			)}
		>
			<span
				aria-hidden
				className={clsx(
					"flex flex-col items-center gap-2",
					!invite &&
						"opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
				)}
			>
				<UiIcon name="plus" className="h-5 w-5" />
				{t(translation.Agents.MonitorAddPanel)}
			</span>
		</button>
	);
}
