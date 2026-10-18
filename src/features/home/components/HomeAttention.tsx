import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";

interface HomeAttentionProps {
	waitingAgents: number;
	doingTasks: number;
	onOpenAgents: () => void;
	onOpenTasks: () => void;
}

const link = clsx(
	"rounded-md px-1.5 py-0.5 transition-colors hover:bg-text/5 hover:text-text",
	"focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accentSoft",
);

/** What is waiting on the user, said under the clock — and nothing at all when nothing is. */
export function HomeAttention({
	waitingAgents,
	doingTasks,
	onOpenAgents,
	onOpenTasks,
}: Readonly<HomeAttentionProps>) {
	const { t } = useTranslation();

	if (waitingAgents === 0 && doingTasks === 0) return null;

	return (
		<p className="-mt-4 flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted">
			{waitingAgents > 0 ? (
				<button type="button" onClick={onOpenAgents} className={clsx(link, "font-semibold text-accent")}>
					{t(translation.Home.AttentionWaiting, { count: waitingAgents })}
				</button>
			) : null}
			{waitingAgents > 0 && doingTasks > 0 ? <span aria-hidden="true">·</span> : null}
			{doingTasks > 0 ? (
				<button type="button" onClick={onOpenTasks} className={link}>
					{t(translation.Home.AttentionDoing, { count: doingTasks })}
				</button>
			) : null}
		</p>
	);
}
