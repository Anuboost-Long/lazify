import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import {
	BodyText,
	CaptionText,
	OverlineText,
	PillText,
	SectionTitle,
} from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { NoProjectBackdrop } from "./NoProjectBackdrop";
import { NoProjectFlowCard } from "./NoProjectFlowCard";

interface DiagnosticsNoProjectStateProps {
	syncing: boolean;
	onSync: () => void;
}

const COLLECTS = [
	translation.Diagnostics.CollectsBrowser,
	translation.Diagnostics.CollectsNetwork,
	translation.Diagnostics.CollectsTerminal,
];

export function DiagnosticsNoProjectState({
	syncing,
	onSync,
}: Readonly<DiagnosticsNoProjectStateProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<section
				className={clsx(
					"group relative w-full max-w-3xl overflow-hidden rounded-[24px]",
					"border border-border bg-soft p-6 shadow-panel md:p-8",
					"motion-safe:animate-fadeIn",
				)}
			>
				<NoProjectBackdrop />

				<div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
					<NoProjectFlowCard />

					<div className="flex min-w-0 flex-col gap-3">
						<OverlineText className="!text-accent">{t(translation.Diagnostics.Eyebrow)}</OverlineText>

						<SectionTitle>{t(translation.Workspace.NoSyncedYet)}</SectionTitle>

						<BodyText tone="muted" className="max-w-lg leading-6">
							{t(translation.Workspace.NoProjectsDesc)}
						</BodyText>

						<div className="mt-1 flex flex-wrap gap-2">
							{COLLECTS.map((label, index) => (
								<span
									key={label}
									style={{ animationDelay: `${index * 60}ms` }}
									className={clsx(
										"flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1.5",
										"motion-safe:animate-fadeIn transition-transform duration-300",
										"motion-safe:hover:-translate-y-0.5",
									)}
								>
									<span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
									<PillText>{t(label)}</PillText>
								</span>
							))}
						</div>

						<div className="mt-2 flex flex-wrap items-center gap-3">
							<button
								type="button"
								disabled={syncing}
								onClick={onSync}
								className={clsx(
									"group/sync inline-flex items-center gap-2 rounded-[18px] px-5 py-2.5",
									"bg-accent text-sm font-semibold text-white shadow-glow",
									"transition-all duration-300 hover:bg-accentHover",
									"motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
									"disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
								)}
							>
								<UiIcon
									name="refresh-circle"
									className={clsx("h-4 w-4", syncing && "motion-safe:animate-spin")}
								/>
								{t(translation.Workspace.SyncProject)}
								<UiIcon
									name="arrow-right"
									className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover/sync:translate-x-0.5"
								/>
							</button>

							<CaptionText tone="muted">{t(translation.Diagnostics.SyncProjectDescription)}</CaptionText>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
