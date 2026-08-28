import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { Logo } from "@renderer/assets/logo.tsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

interface SidebarHeaderProps {
	collapsed: boolean;
	compactMode: boolean;
	onToggleSidebar: () => void;
}

const LOGO_COLOR = "rgb(var(--color-text-muted))";
const LOGO_BOLT_COLOR = "rgb(var(--color-accent))";

/**
 * The brand mark at the top of the rail, in the three shapes it takes: a static
 * mark in compact mode, the expand button when collapsed, and the full name with
 * a collapse button when open.
 */
export function SidebarHeader({
	collapsed,
	compactMode,
	onToggleSidebar,
}: Readonly<SidebarHeaderProps>) {
	const { t } = useTranslation();

	function brand() {
		if (compactMode) {
			/* Compact: static brand mark, matches nav item size */
			return (
				<div className="flex w-full items-center justify-center rounded-xl bg-accent/15 py-3">
					<Logo size={20} color={LOGO_COLOR} boltColor={LOGO_BOLT_COLOR} />
				</div>
			);
		}

		if (collapsed) {
			/* Collapsed: Logo IS the expand button, matches nav item size */
			return (
				<Tooltip content={t(translation.Sidebar.Open)} side="right">
					<button
						type="button"
						onClick={onToggleSidebar}
						className={clsx(
							"flex w-full items-center justify-center",
							"rounded-xl border border-transparent py-3",
							"hover:border-border hover:bg-bg",
						)}
						aria-label={t(translation.Sidebar.Open)}
					>
						<Logo size={20} color={LOGO_COLOR} boltColor={LOGO_BOLT_COLOR} />
					</button>
				</Tooltip>
			);
		}

		/* Expanded: Logo + app name + collapse button */
		return (
			<>
				<div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2">
					<Logo size={20} color={LOGO_COLOR} boltColor={LOGO_BOLT_COLOR} className="shrink-0" />
					<div className="min-w-0">
						<CardTitle className="text-sm">{t(translation.Sidebar.AppName)}</CardTitle>
						<BodyText className="text-xs text-muted">{t(translation.Sidebar.AppSubtitle)}</BodyText>
					</div>
				</div>
				<button
					type="button"
					onClick={onToggleSidebar}
					className={clsx(
						"flex h-8 w-8 shrink-0 items-center justify-center",
						"rounded-xl border border-transparent text-muted",
						"hover:border-border hover:bg-bg hover:text-text",
					)}
					aria-label={t(translation.Sidebar.Collapse)}
				>
					<UiIcon name="arrow-left" className="h-4 w-4" />
				</button>
			</>
		);
	}

	return (
		<div className={clsx("flex items-center pb-3", collapsed ? "justify-center" : "gap-2")}>
			{brand()}
		</div>
	);
}
