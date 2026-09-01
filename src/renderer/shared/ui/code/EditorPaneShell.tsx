import clsx from "clsx";
import type { ReactNode } from "react";

import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface EditorPaneShellProps {
	icon: UiIconName;
	title: string;
	subtitle: string;
	/** Right-hand status chip: "Editable", "Read only", … */
	badge: string;
	/** Optional control between the title and the badge. */
	headerAction?: ReactNode;
	/**
	 * Open-file tabs. When given they take the header's width in place of the
	 * title/subtitle block, which the active tab already names.
	 */
	tabs?: ReactNode;
	/**
	 * "card" is the standalone pane: own border, radius, shadow, fixed height.
	 * "flush" fills a frame that already provides those — the split workbench —
	 * and drops the inset padding so the code itself gets the room.
	 */
	chrome?: "card" | "flush";
	/** Sits under the body at its own height, e.g. the findings panel. */
	footer?: ReactNode;
	children: ReactNode;
}

/**
 * The framing both editor panes share — header, and the surface behind the
 * body. What goes inside is the panes' own business.
 */
export function EditorPaneShell({
	icon,
	title,
	subtitle,
	badge,
	headerAction,
	tabs,
	chrome = "card",
	footer,
	children,
}: Readonly<EditorPaneShellProps>) {
	const flush = chrome === "flush";

	return (
		<div
			className={clsx(
				"flex flex-col overflow-hidden bg-bg",
				flush ? "h-full" : "h-[44rem] rounded-[26px] border border-border shadow-panel",
			)}
		>
			<div
				className={clsx(
					"flex min-w-0 shrink-0 border-b border-border bg-soft",
					// Tabs run edge to edge and full height, so the header supplies no
					// padding of its own — each tab owns its own hit area.
					tabs ? "h-9 items-stretch" : clsx("items-center gap-2", flush ? "px-4 py-2.5" : "px-5 py-3.5"),
				)}
			>
				{tabs ? (
					<>
						{tabs}
						{/* Alongside tabs the badge drops its pill chrome — the width it
                was spending on a border belongs to the actions instead. */}
						<div className="flex shrink-0 items-center gap-1.5 pl-2 pr-2">
							{headerAction}
							<PillText className="text-muted/70">{badge}</PillText>
						</div>
					</>
				) : (
					<>
						<UiIcon name={icon} className="h-4 w-4 text-warning" />
						<div className="min-w-0 flex-1">
							<CardTitle className="truncate text-sm">{title}</CardTitle>
							<OverlineText className="truncate text-muted">{subtitle}</OverlineText>
						</div>
						{headerAction}
						<PillText className="rounded-full border border-border bg-bg px-3 py-1 text-muted">
							{badge}
						</PillText>
					</>
				)}
			</div>

			<div
				className={clsx("min-h-0 flex-1", flush ? "" : "p-5")}
				style={
					flush
						? undefined
						: {
								background:
									"radial-gradient(circle at top right, rgb(var(--color-accent) / 0.06), transparent 30%), rgb(var(--color-bg))",
							}
				}
			>
				{children}
			</div>

			{footer}
		</div>
	);
}

/**
 * The placeholder the panes show when there is nothing to display.
 *
 * In "card" chrome it is a dashed inset card, which reads correctly inside the
 * pane's own padding. In "flush" chrome the body is already full-bleed, so the
 * frame would just be a second border inside the pane — the message sits
 * directly on the surface instead.
 */
export function EditorPaneNotice({
	title,
	description,
	tone = "neutral",
	chrome = "card",
}: Readonly<{
	title: string;
	description?: string;
	tone?: "neutral" | "error";
	chrome?: "card" | "flush";
}>) {
	const isError = tone === "error";
	const flush = chrome === "flush";

	return (
		<div
			className={clsx(
				"flex h-full items-center justify-center p-8 text-center",
				!flush && "rounded-[20px] border border-dashed",
				isError
					? clsx("bg-error/5", !flush && "border-error/25")
					: clsx(!flush && "border-border bg-soft/30"),
			)}
		>
			<div className="max-w-md">
				<CardTitle className={isError ? "text-lg text-error" : "text-lg"}>{title}</CardTitle>
				{description ? (
					<BodyText className={isError ? "mt-3 whitespace-pre-wrap text-text/70" : "mt-3 text-muted"}>
						{description}
					</BodyText>
				) : null}
			</div>
		</div>
	);
}
