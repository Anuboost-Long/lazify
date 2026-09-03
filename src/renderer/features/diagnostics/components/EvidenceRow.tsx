import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { EvidenceItem } from "@main/diagnostic-tests/types";
import { CaptionText, MonoText } from "@renderer/shared/typography";

import { evidenceSourceLabel } from "../lib/run-verdict";

const SEVERITY_TEXT = {
	error: "text-error",
	warning: "text-warning",
	info: "text-text",
} as const;

export function EvidenceRow({ item }: Readonly<{ item: EvidenceItem }>) {
	const { t } = useTranslation();
	const showDetails = item.details && item.details !== item.summary;

	return (
		<li className="px-4 py-2">
			<CaptionText as="p" className="uppercase tracking-[0.14em]">
				{t(evidenceSourceLabel(item.source))}
				{item.stepIndex === null ? "" : ` · ${String(item.stepIndex + 1).padStart(2, "0")}`}
			</CaptionText>

			<p className={clsx("mt-0.5 break-words text-[13px] leading-5", SEVERITY_TEXT[item.severity])}>
				{item.summary}
			</p>

			{showDetails ? (
				<MonoText as="pre" className="mt-1 whitespace-pre-wrap break-words">
					{item.details}
				</MonoText>
			) : null}
		</li>
	);
}
