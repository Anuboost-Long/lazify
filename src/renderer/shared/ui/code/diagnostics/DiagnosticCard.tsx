import clsx from "clsx";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { SOURCE_LABEL } from "./finding-groups";
import type { DiagnosticCardState } from "./use-code-diagnostics";

const CARD_WIDTH = 320;
const VIEWPORT_MARGIN = 12;
/** Sits above the pointer so the underlined code stays readable under it. */
const POINTER_GAP = 18;

interface DiagnosticCardProps {
	state: DiagnosticCardState | null;
	onPointerEnter: () => void;
	onPointerLeave: () => void;
	/** Omitted where no agent can be reached, which is what hides the button. */
	onFix?: () => void;
}

/**
 * What one finding says, on hover.
 *
 * Portalled to the body for the same reason the context menu is: the pointer's
 * coordinates are the viewport's, and `fixed` only means the viewport while no
 * ancestor carries a transform or a backdrop filter — which every modal does.
 */
export function DiagnosticCard({
	state,
	onPointerEnter,
	onPointerLeave,
	onFix,
}: Readonly<DiagnosticCardProps>) {
	const { t } = useTranslation();

	if (!state) return null;

	const { diagnostic, x, y } = state;
	const left = Math.max(
		VIEWPORT_MARGIN,
		Math.min(x, globalThis.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN),
	);

	return createPortal(
		<div
			role="tooltip"
			onPointerEnter={onPointerEnter}
			onPointerLeave={onPointerLeave}
			className={clsx(
				"fixed z-[60] w-80 -translate-y-full rounded-[16px] border border-border",
				"bg-soft p-3 shadow-panel",
			)}
			style={{ left, top: Math.max(VIEWPORT_MARGIN, y - POINTER_GAP) }}
		>
			<div className="mb-1.5 flex items-center gap-2">
				<span
					aria-hidden
					className={clsx(
						"h-1.5 w-1.5 shrink-0 rounded-full",
						diagnostic.source === "tailwindcss" ? "bg-accent" : "bg-warning",
					)}
				/>
				<SmallText as="span" className="!text-muted">
					{t(SOURCE_LABEL[diagnostic.source])}
				</SmallText>
				{diagnostic.code ? (
					<span className="ml-auto font-mono text-[11px] text-muted/80">{diagnostic.code}</span>
				) : null}
			</div>

			<SmallText as="p" className="!text-text">
				{diagnostic.message}
			</SmallText>

			{onFix || diagnostic.url ? (
				<div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5">
					{onFix ? (
						<button
							type="button"
							onClick={onFix}
							className="flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-accent-hover"
						>
							<UiIcon name="chat-question" className="h-3.5 w-3.5" />
							{t(translation.CodeQuality.FixWithAgent)}
						</button>
					) : null}

					{diagnostic.url ? (
						<button
							type="button"
							onClick={() => void globalThis.lazify.openExternalUrl(diagnostic.url as string)}
							className="ml-auto text-xs text-muted transition-colors hover:text-text"
						>
							{t(translation.CodeQuality.ReadRule)}
						</button>
					) : null}
				</div>
			) : null}
		</div>,
		document.body,
	);
}
