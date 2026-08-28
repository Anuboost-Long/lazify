import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { AppPageId, AppPageLink } from "@renderer/app/app-sidebar.constant";
import type { ToolDefinition } from "@renderer/features/tools/catalog";
import { translation } from "@renderer/i18n/translation";
import { BodyText, Typography } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarMiniItem } from "./SidebarMiniItem";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarPinnedTools } from "./SidebarPinnedTools";

interface SidebarProps {
	pages: AppPageLink[];
	pinnedTools: ToolDefinition[];
	activePath: string;
	activePage: AppPageId | null;
	collapsed: boolean;
	theme: "light" | "dark";
	compactMode?: boolean;
	onStartWorkflow: () => void;
	onToggleSidebar: () => void;
	onNavigate: (path: string) => void;
	onToggleTheme: () => void;
}

export function Sidebar({
	pages,
	pinnedTools,
	activePath,
	activePage,
	collapsed,
	theme,
	compactMode = false,
	onStartWorkflow,
	onToggleSidebar,
	onNavigate,
	onToggleTheme,
}: Readonly<SidebarProps>) {
	const { t } = useTranslation();
	const pinnedToolActive = pinnedTools.some((tool) => tool.path === activePath);

	return (
		<aside
			className={clsx(
				"relative z-40 flex h-full shrink-0 flex-col",
				"border-r border-border bg-soft",
				"transition-[width] duration-200 ease-out",
				collapsed ? "w-[72px]" : "w-[280px]",
			)}
		>
			<div className="flex h-full flex-col p-3">
				{/* ── Header ─────────────────────────────── */}
				<SidebarHeader
					collapsed={collapsed}
					compactMode={compactMode}
					onToggleSidebar={onToggleSidebar}
				/>

				{/* ── New workflow button ─────────────────── */}
				<Tooltip content={collapsed ? t(translation.Sidebar.StartNewWorkflow) : null} side="right">
					<button
						type="button"
						onClick={onStartWorkflow}
						className={clsx(
							"mb-4 flex items-center gap-3",
							"rounded-xl bg-accent px-3 py-3 transition-colors hover:bg-accentHover",
							"text-sm font-medium text-white",
							collapsed && "justify-center px-0",
						)}
						aria-label={t(translation.Sidebar.StartNewWorkflow)}
					>
						<UiIcon name="play" filled className="h-4 w-4 shrink-0 text-white" />
						{/* Forced rather than inherited: the variant carries `text-text`,
                which flips with the theme and would go dark on the accent. */}
						{!collapsed && (
							<Typography as="span" variant="body" className="!text-white">
								{t(translation.Sidebar.NewWorkflow)}
							</Typography>
						)}
					</button>
				</Tooltip>

				{/* ── Nav ────────────────────────────────── */}
				<nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					{pages.map((page) => {
						const isActive = page.id === activePage && !(page.id === "tools" && pinnedToolActive);

						return collapsed ? (
							<SidebarMiniItem
								key={page.id}
								icon={page.icon}
								label={t(page.label)}
								isActive={isActive}
								onClick={() => onNavigate(page.path)}
							/>
						) : (
							<SidebarNavItem
								key={page.id}
								icon={page.icon}
								label={t(page.label)}
								description={t(page.description)}
								isActive={isActive}
								onClick={() => onNavigate(page.path)}
							/>
						);
					})}

					<SidebarPinnedTools
						tools={pinnedTools}
						activePath={activePath}
						collapsed={collapsed}
						onNavigate={onNavigate}
					/>
				</nav>

				{/* ── Theme toggle ───────────────────────── */}
				<div className="border-t border-border pt-3">
					<Tooltip content={collapsed ? `${t(translation.Sidebar.Theme)}: ${theme}` : null} side="right">
						<button
							type="button"
							onClick={onToggleTheme}
							className={clsx(
								"flex w-full items-center gap-3 rounded-xl px-3 py-3",
								"text-sm text-muted hover:bg-bg/70 hover:text-text",
								collapsed && "justify-center px-0",
							)}
							aria-label={t(translation.Sidebar.ToggleTheme)}
						>
							<UiIcon name={theme === "dark" ? "sun" : "moon"} className="h-5 w-5 shrink-0 text-muted" />
							{!collapsed && (
								<div className="min-w-0">
									<Typography variant="body" className="font-medium text-text">
										{t(translation.Sidebar.Theme)}
									</Typography>
									<BodyText className="text-xs capitalize text-muted">
										{theme === "dark" ? t(translation.Settings.Dark) : t(translation.Settings.Light)}
									</BodyText>
								</div>
							)}
						</button>
					</Tooltip>
				</div>
			</div>
		</aside>
	);
}
