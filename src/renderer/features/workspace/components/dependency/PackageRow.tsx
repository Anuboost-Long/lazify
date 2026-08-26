import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { InstalledPackage } from "@renderer/shared/types/lazify";
import { MonoText, PillText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface PackageRowProps {
	pkg: InstalledPackage;
	removing: boolean;
	disabled: boolean;
	onRemove: () => void;
}

export function PackageRow({ pkg, removing, disabled, onRemove }: PackageRowProps) {
	const { t } = useTranslation();

	return (
		<div
			className={clsx(
				"group relative overflow-hidden rounded-2xl border bg-soft transition-[transform,border-color,box-shadow] duration-200",
				"border-black/[0.06] dark:border-white/[0.04]",
				removing ? "opacity-50" : "hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
			)}
		>
			{/* Left accent rail */}
			<div
				className={clsx(
					"pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full",
					pkg.isDev ? "bg-border/60" : "bg-accent opacity-60 group-hover:opacity-100",
				)}
			/>

			<div className="flex items-center gap-3 px-4 py-3 pl-5">
				{/* Type icon badge */}
				<div
					className={clsx(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
						"border-black/[0.06] dark:border-white/[0.04]",
						pkg.isDev ? "bg-bg text-muted" : "bg-accent/10 text-accent",
					)}
				>
					<UiIcon name="package" className="h-3.5 w-3.5" />
				</div>

				{/* Name + version */}
				<div className="min-w-0 flex-1">
					<MonoText
						as="span"
						className={clsx(
							"block truncate text-[13px] font-semibold leading-tight",
							pkg.isDev ? "text-text/80" : "text-text",
						)}
					>
						{pkg.name}
					</MonoText>
					<MonoText as="span" className="mt-0.5 block text-[11px] leading-tight text-muted">
						{pkg.versionSpec}
					</MonoText>
				</div>

				{/* Type badge */}
				<PillText
					as="span"
					className={clsx(
						"shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]",
						"border-black/[0.06] dark:border-white/[0.04]",
						pkg.isDev ? "bg-bg text-muted/60" : "bg-accent/10 text-accent",
					)}
				>
					{pkg.isDev ? t(translation.DependencyPane.DevBadge) : t(translation.DependencyPane.DepBadge)}
				</PillText>

				{/* Remove button */}
				<IconButton
					icon={removing ? "refresh-circle" : "trash"}
					iconClassName={clsx("h-3.5 w-3.5", removing && "animate-spin text-muted")}
					onClick={onRemove}
					disabled={disabled}
					aria-label={`Remove ${pkg.name}`}
					className={clsx(
						"h-7 w-7 shrink-0 rounded-full border transition-all duration-150",
						removing
							? "cursor-default border-red-300/30 bg-red-500/10 text-red-400"
							: "border-red-300/40 bg-red-500/8 text-red-400/70 hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-500 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-400/60 dark:hover:border-red-400/35 dark:hover:bg-red-500/18 dark:hover:text-red-400",
					)}
				/>
			</div>
		</div>
	);
}

// ─── Search result row ────────────────────────────────────────────────────────
