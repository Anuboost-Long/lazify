import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ScanFileFindings } from "@main/linting";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ScanFileGroupProps {
	file: ScanFileFindings;
	/** Absent where nothing above this can hand work to an agent. */
	onFix?: () => void;
	onOpen: (line: number) => void;
}

export function ScanFileGroup({ file, onFix, onOpen }: Readonly<ScanFileGroupProps>) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(true);

	return (
		<div className="border-b border-border last:border-b-0">
			<div className="flex items-center gap-2 px-3 py-1.5">
				<button
					type="button"
					onClick={() => setOpen((current) => !current)}
					aria-expanded={open}
					className="flex min-w-0 flex-1 items-center gap-2 text-left"
				>
					<UiIcon name={open ? "collapse" : "expand"} className="h-3.5 w-3.5 shrink-0 text-muted" />
					<MonoText as="span" className="truncate text-[11px] !text-text">
						{file.path}
					</MonoText>
					<CaptionText tone="muted" className="ml-auto shrink-0 tabular-nums">
						{file.findings.length}
					</CaptionText>
				</button>

				{onFix ? (
					<button
						type="button"
						onClick={onFix}
						className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-muted transition-colors hover:bg-accent/10 hover:text-accent"
					>
						{t(translation.CodeQuality.FixWithAgent)}
					</button>
				) : null}
			</div>

			{open ? (
				<div className="pb-1">
					{file.findings.map((finding) => (
						<button
							key={`${finding.diagnostic.line}:${finding.diagnostic.column}:${finding.diagnostic.rule}`}
							type="button"
							onClick={() => onOpen(finding.diagnostic.line)}
							className="flex w-full items-center gap-2.5 px-3 py-1 text-left transition-colors hover:bg-text/[0.04]"
						>
							<span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted/80">
								{finding.diagnostic.line}
							</span>
							{finding.diagnostic.code ? (
								<span
									className={clsx(
										"shrink-0 font-mono text-[11px]",
										finding.diagnostic.source === "tailwindcss" ? "text-accent" : "text-warning",
									)}
								>
									{finding.diagnostic.code}
								</span>
							) : null}
							<SmallText as="span" className="truncate !text-text">
								{finding.diagnostic.message}
							</SmallText>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
