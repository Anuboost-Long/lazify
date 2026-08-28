import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { DetectedTool } from "@renderer/shared/types/lazify";
import { CardTitle, MonoText, PillText } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * One detected tool.
 *
 * The card used to paint availability six times over — gradient wash, shimmer
 * line, accent rail, saturated icon chip, coloured title, coloured version,
 * coloured pill — so a full grid read as a wall of green with red alarms in it.
 * Now the surface is neutral for every state and status is carried by the rail,
 * the icon chip and one pill. Missing is a fact, not an error, so it is amber
 * rather than red. The playful part is the clipped artwork and the hover lift,
 * which only actionable cards get — that is how you tell them apart.
 */

interface ToolCardProps {
	tool: DetectedTool;
	onAction?: () => void;
	actionLabel?: string;
	/**
	 * A second, destructive action (uninstall). A card that is itself a button
	 * cannot hold one, so offering it turns the card into a plain surface with
	 * both actions spelled out in the footer.
	 */
	onSecondaryAction?: () => void;
	secondaryActionLabel?: string;
	loading?: boolean;
}

interface CardActionProps {
	loading?: boolean;
	onAction?: () => void;
	actionLabel?: string;
	onSecondaryAction?: () => void;
	secondaryActionLabel?: string;
}

/** The right-hand side of the footer: a spinner, two controls, or the hint. */
function CardAction({
	loading,
	onAction,
	actionLabel,
	onSecondaryAction,
	secondaryActionLabel,
}: Readonly<CardActionProps>) {
	const { t } = useTranslation();

	if (loading) {
		return (
			<span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
				<UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin text-accent" />
			</span>
		);
	}

	if (onSecondaryAction) {
		/* Two explicit controls: the card is not the button here, so each
		   action has to name itself. Removal stays quiet until hovered — it
		   is the rarer of the two and the one that cannot be undone. */
		return (
			<span className="ml-auto flex shrink-0 items-center gap-1.5">
				{onAction ? (
					<button
						type="button"
						onClick={onAction}
						className={clsx(
							"rounded-full border border-border bg-soft px-2.5 py-1",
							"text-[10px] font-semibold uppercase tracking-[0.12em] text-muted",
							"hover:border-accent/40 hover:text-accent",
						)}
					>
						{actionLabel ?? t(translation.GlobalTerm.Open)}
					</button>
				) : null}

				<button
					type="button"
					onClick={onSecondaryAction}
					className={clsx(
						"rounded-full border border-border bg-soft px-2.5 py-1",
						"text-[10px] font-semibold uppercase tracking-[0.12em] text-muted",
						"hover:border-error/40 hover:text-error",
					)}
				>
					{secondaryActionLabel ?? t(translation.GlobalTerm.Uninstall)}
				</button>
			</span>
		);
	}

	if (!onAction) return null;

	return (
		<span className="ml-auto flex shrink-0 items-center gap-1.5">
			<PillText
				as="span"
				className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-muted group-hover:!text-accent"
			>
				{actionLabel ?? t(translation.GlobalTerm.Open)}
			</PillText>
			<span
				className={clsx(
					"flex h-6 w-6 items-center justify-center rounded-full border border-border bg-soft text-muted",
					"transition-[transform] duration-200",
					"group-hover:translate-x-0.5 group-hover:border-accent/40 group-hover:text-accent",
				)}
			>
				<UiIcon name="arrow-right" className="h-3 w-3" />
			</span>
		</span>
	);
}

export function ToolCard({
	tool,
	onAction,
	actionLabel,
	onSecondaryAction,
	secondaryActionLabel,
	loading,
}: Readonly<ToolCardProps>) {
	const { t } = useTranslation();
	const Tag = onAction && !onSecondaryAction ? "button" : "article";
	const isClickable = !!onAction && !onSecondaryAction && !loading;

	return (
		<Tag
			{...(isClickable ? { type: "button" as const, onClick: onAction } : {})}
			disabled={loading || undefined}
			className={clsx(
				"group relative flex w-full flex-col overflow-hidden text-left",
				"rounded-2xl border border-border bg-soft px-4 py-3.5 shadow-panel",
				"transition-[transform,box-shadow] duration-200",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
				loading && "cursor-wait",
				isClickable && "hover:-translate-y-0.5 hover:border-accent hover:shadow-accent-md",
			)}
		>
			<CardShapes variant={tool.available ? 0 : 2} className="opacity-[0.14] group-hover:opacity-30" />

			{/* State rail. The one place availability is colour-coded on the surface
          itself, so the grid can be scanned down its left edge. */}
			<div
				className={clsx(
					"pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full",
					tool.available ? "bg-accent" : "bg-border",
				)}
			/>

			<div className="relative flex items-center gap-3 pl-1.5">
				<div
					className={clsx(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
						tool.available
							? "border-accent/20 bg-accent/10 text-accent"
							: "border-border bg-soft text-muted",
					)}
				>
					<UiIcon name={tool.available ? "check-circle" : "xmark"} className="h-[17px] w-[17px]" />
				</div>

				<div className="min-w-0 flex-1">
					<CardTitle className="truncate text-sm font-semibold leading-none text-text">
						{tool.displayName}
					</CardTitle>
					<MonoText as="span" className="mt-1.5 block truncate text-[11px] text-muted">
						{tool.available
							? (tool.version ?? t(translation.Environment.Detected))
							: t(translation.Environment.NotInstalled)}
					</MonoText>
				</div>
			</div>

			{/* Footer. Status on the left, the action on the right — separating them
          is what stops the two pills from reading as the same control. */}
			<div className="relative mt-3.5 flex items-center gap-2 border-t border-border/60 pl-1.5 pt-2.5">
				<PillText
					as="span"
					className={clsx(
						"shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
						tool.available
							? "border-accent/25 bg-accent/10 !text-accent"
							: "border-warning/30 bg-warning/10 !text-warning",
					)}
				>
					{tool.available ? t(translation.Environment.Installed) : t(translation.Environment.Missing)}
				</PillText>

				<CardAction
					loading={loading}
					onAction={onAction}
					actionLabel={actionLabel}
					onSecondaryAction={onSecondaryAction}
					secondaryActionLabel={secondaryActionLabel}
				/>
			</div>
		</Tag>
	);
}
