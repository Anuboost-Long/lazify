import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import { MONITOR_COLUMN_CHOICES, type MonitorColumns } from "../hooks/use-monitor-panels";

interface AgentMonitorLayoutModalProps {
	open: boolean;
	columns: MonitorColumns;
	onSelect: (columns: MonitorColumns) => void;
	onClose: () => void;
}

const PREVIEW_CELLS: Record<MonitorColumns, number> = {
	auto: 2,
	1: 1,
	2: 2,
	3: 3,
};

function LayoutPreview({ columns }: Readonly<{ columns: MonitorColumns }>) {
	const across = PREVIEW_CELLS[columns];

	return (
		<div
			aria-hidden
			className="flex h-9 w-12 shrink-0 flex-col gap-[3px] rounded-lg border border-border bg-soft p-1"
		>
			{[0, 1].map((row) => (
				<div key={row} className="flex flex-1 gap-[3px]">
					{Array.from({ length: across }, (_, cell) => `${row}-${cell}`).map((cellKey) => (
						<span key={cellKey} className="flex-1 rounded-[2px] bg-text/20" />
					))}
				</div>
			))}
		</div>
	);
}

export function AgentMonitorLayoutModal({
	open,
	columns,
	onSelect,
	onClose,
}: Readonly<AgentMonitorLayoutModalProps>) {
	const { t } = useTranslation();

	return (
		<BaseModal open={open} onClose={onClose}>
			<div
				className={clsx(
					"w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden",
					"rounded-shell border border-border bg-soft shadow-panel",
				)}
			>
				<div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
					<div className="min-w-0">
						<OverlineText className="text-muted">{t(translation.Agents.LiveMonitor)}</OverlineText>
						<SectionTitle className="mt-1 truncate text-2xl">
							{t(translation.Agents.MonitorLayout)}
						</SectionTitle>
					</div>

					<button
						type="button"
						onClick={onClose}
						aria-label={t(translation.GlobalTerm.Close)}
						className={clsx(
							"shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
							"text-muted hover:border-accent/30 hover:text-text",
						)}
					>
						<UiIcon name="xmark" className="h-4 w-4" />
					</button>
				</div>

				<div className="flex flex-col gap-2 px-6 py-5">
					<CaptionText tone="muted">{t(translation.Agents.MonitorLayoutDesc)}</CaptionText>

					{MONITOR_COLUMN_CHOICES.map((choice) => {
						const current = choice === columns;

						return (
							<button
								key={choice}
								type="button"
								aria-pressed={current}
								onClick={() => {
									onSelect(choice);
									onClose();
								}}
								className={clsx(
									"flex items-center gap-3 rounded-2xl border px-4 py-3 text-left",
									"transition-colors duration-150",
									current
										? "border-accent/50 bg-accent/[0.06]"
										: "border-border bg-bg hover:border-accent/50 hover:bg-accent/[0.06]",
								)}
							>
								<LayoutPreview columns={choice} />

								<div className="min-w-0 flex-1">
									<BodyText className="truncate">
										{choice === "auto"
											? t(translation.Agents.MonitorLayoutAuto)
											: t(translation.Agents.MonitorLayoutColumns, { count: choice })}
									</BodyText>
									{choice === "auto" ? (
										<CaptionText tone="muted" className="truncate">
											{t(translation.Agents.MonitorLayoutAutoDesc)}
										</CaptionText>
									) : null}
								</div>

								<UiIcon
									name="check-circle"
									className={clsx("h-4 w-4 shrink-0 text-accent", current ? "opacity-100" : "opacity-0")}
								/>
							</button>
						);
					})}
				</div>
			</div>
		</BaseModal>
	);
}
