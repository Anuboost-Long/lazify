import clsx from "clsx";

import { translation } from "@renderer/i18n/translation";
import { BodyText, MonoText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";

import type { NpmPackageSearchResult } from "../../../../../main/scaffolding/npm-registry";

interface SearchResultRowProps {
	pkg: NpmPackageSearchResult;
	isInstalled: boolean;
	isActioning: boolean;
	anyActioning: boolean;
	onInstall: (dev: boolean) => void;
}

export function SearchResultRow({
	pkg,
	isInstalled,
	isActioning,
	anyActioning,
	onInstall,
}: Readonly<SearchResultRowProps>) {
	return (
		<div
			className={clsx(
				"relative overflow-hidden rounded-2xl border bg-soft transition-[border-color,box-shadow] duration-200",
				"border-black/[0.06] dark:border-white/[0.04]",
				isInstalled ? "bg-accent/5" : "hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]",
			)}
		>
			{/* Left rail */}
			<div
				className={clsx(
					"pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full",
					isInstalled ? "bg-accent opacity-70" : "bg-border/40",
				)}
			/>

			<div className="flex items-start gap-3 px-4 py-3 pl-5">
				{/* Icon badge */}
				<div
					className={clsx(
						"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
						"border-black/[0.06] dark:border-white/[0.04]",
						isInstalled ? "bg-accent/10 text-accent" : "bg-bg text-muted",
					)}
				>
					<UiIcon name={isInstalled ? "check-circle" : "package"} className="h-3.5 w-3.5" />
				</div>

				{/* Text content */}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<MonoText as="span" className="text-[13px] font-semibold text-text">
							{pkg.name}
						</MonoText>
						<PillText as="span" className="text-[10px] text-muted">
							v{pkg.version}
						</PillText>
						{pkg.publisher && (
							<PillText
								as="span"
								className="rounded-full border border-border/50 bg-bg px-2 py-0.5 text-[9px] text-muted"
							>
								{pkg.publisher}
							</PillText>
						)}
					</div>

					{pkg.description && (
						<BodyText className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted">
							{pkg.description}
						</BodyText>
					)}

					{pkg.keywords.length > 0 && (
						<div className="mt-1.5 flex flex-wrap gap-1">
							{pkg.keywords.slice(0, 4).map((kw) => (
								<span
									key={kw}
									className="rounded-full border border-border/40 bg-bg/80 px-1.5 py-0.5 text-[9px] text-muted/70"
								>
									{kw}
								</span>
							))}
						</div>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex shrink-0 flex-col items-end gap-1.5">
					{isInstalled ? (
						<PillText
							as="span"
							className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent"
						>
							installed
						</PillText>
					) : (
						<>
							<LabelButton
								label={translation.DependencyPane.InstallAsDep}
								icon="plus"
								variant="accent"
								loading={isActioning}
								disabled={anyActioning}
								onClick={() => onInstall(false)}
							/>
							<LabelButton
								label={translation.DependencyPane.InstallAsDev}
								icon="plus"
								loading={isActioning}
								disabled={anyActioning}
								onClick={() => onInstall(true)}
							/>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Main pane ────────────────────────────────────────────────────────────────
