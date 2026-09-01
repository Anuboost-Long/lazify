import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

export type DocTab = "write" | "agent" | "design" | "preview";

interface DocBuilderHeaderProps {
	collectionName: string;
	tab: DocTab;
	saving: boolean;
	sent: boolean;
	openQuestions: number;
	onShowTab: (tab: DocTab) => void;
	onAskAll: () => void;
	onClose: () => void;
}

export function DocBuilderHeader({
	collectionName,
	tab,
	saving,
	sent,
	openQuestions,
	onShowTab,
	onAskAll,
	onClose,
}: Readonly<DocBuilderHeaderProps>) {
	const { t } = useTranslation();

	const status = () => {
		if (saving) return t(translation.ApiStudio.DocSaving);
		if (sent) return t(translation.ApiStudio.DocAskAgentSent);
		if (openQuestions > 0) {
			return t(translation.ApiStudio.DocOpenQuestions, { count: openQuestions });
		}

		return t(translation.ApiStudio.DocNoQuestions);
	};

	const tabs: Array<[DocTab, string]> = [
		["write", t(translation.ApiStudio.DocWrite)],
		["agent", t(translation.ApiStudio.DocAgent)],
		["design", t(translation.ApiStudio.DocDesign)],
		["preview", t(translation.ApiStudio.DocPreview)],
	];

	return (
		<header className="flex items-center gap-3 border-b border-border px-5 py-3">
			<UiIcon name="journal-page" className="h-4 w-4 shrink-0 text-accent" />
			<span className="truncate text-sm font-semibold text-text">
				{t(translation.ApiStudio.DocBuilderFor, { collection: collectionName })}
			</span>

			<div className="ml-2 flex items-center gap-0.5">
				{tabs.map(([key, label]) => (
					<button
						key={key}
						type="button"
						onClick={() => onShowTab(key)}
						className={clsx(
							"rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
							tab === key ? "bg-accent/10 text-text" : "text-muted hover:text-text",
						)}
					>
						{label}
					</button>
				))}
			</div>

			<span className="flex-1" />

			<span className="shrink-0 text-[11px] text-muted">{status()}</span>

			{openQuestions > 0 ? (
				<button
					type="button"
					onClick={onAskAll}
					className={clsx(
						"flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1",
						"text-[11px] font-medium text-text transition-colors hover:border-accent/40",
					)}
				>
					<UiIcon name="sparks" className="h-3.5 w-3.5 text-accent" />
					{t(translation.ApiStudio.DocAskAgentAll, { count: openQuestions })}
				</button>
			) : null}

			<button
				type="button"
				onClick={onClose}
				aria-label={t(translation.ApiStudio.Close)}
				className="shrink-0 text-muted transition-colors hover:text-text"
			>
				<UiIcon name="xmark" className="h-4 w-4" />
			</button>
		</header>
	);
}
