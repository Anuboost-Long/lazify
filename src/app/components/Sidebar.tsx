import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppPageId, AppPageLink } from "@/app/app-sidebar.constant";
import { Logo } from "@/assets/logo";
import type { ToolDefinition } from "@/features/tools/catalog";
import { translation } from "@/i18n/translation";
import { useShortcutCombo, useShortcuts } from "@/shared/hooks/use-shortcuts";
import type { ThemePreference } from "@/shared/hooks/use-theme";
import { formatCombo } from "@/shared/lib/shortcuts";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";
import { OverlineText, Typography } from "@/shared/typography";
import { ContextMenu } from "@/shared/ui/ContextMenu";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

import { SidebarMiniItem } from "./SidebarMiniItem";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarPinnedTools } from "./SidebarPinnedTools";
import { SidebarRecentProjects } from "./SidebarRecentProjects";

const themeChoices = [
	{ preference: "system", label: translation.Settings.System, icon: "computer" },
	{ preference: "light", label: translation.Settings.Light, icon: "sun" },
	{ preference: "dark", label: translation.Settings.Dark, icon: "moon" },
] as const;

interface SidebarProps {
	pages: AppPageLink[];
	pinnedTools: ToolDefinition[];
	recentProjects: SyncedWorkspaceProject[];
	/** The project the AI Agents page is showing, while it is open. */
	openProjectPath: string | null;
	activePath: string;
	activePage: AppPageId | null;
	collapsed: boolean;
	theme: "light" | "dark";
	themePreference: ThemePreference;
	onStartWorkflow: () => void;
	onNavigate: (path: string) => void;
	onOpenProject: (projectPath: string) => void;
	onThemeChange: (preference: ThemePreference) => void;
	/** Absent in compact mode, where the rail stays collapsed. */
	onToggleCollapse?: () => void;
}

export function Sidebar({
	pages,
	pinnedTools,
	recentProjects,
	openProjectPath,
	activePath,
	activePage,
	collapsed,
	theme,
	themePreference,
	onStartWorkflow,
	onNavigate,
	onOpenProject,
	onThemeChange,
	onToggleCollapse,
}: Readonly<SidebarProps>) {
	const { t } = useTranslation();
	const [themeMenuAt, setThemeMenuAt] = useState<{ x: number; y: number } | null>(null);
	const sidebarCombo = useShortcutCombo("toggle-sidebar");
	const newWorkflowCombo = useShortcutCombo("new-workflow");
	const { bindings } = useShortcuts();
	const pinnedToolActive = pinnedTools.some((tool) => tool.path === activePath);
	const settingsPage = pages.find((page) => page.id === "settings");

	const renderPage = (page: AppPageLink) => {
		const isActive = page.id === activePage && !(page.id === "tools" && pinnedToolActive);
		const shortcut = page.shortcut && formatCombo(bindings[page.shortcut]);

		return collapsed ? (
			<SidebarMiniItem
				key={page.id}
				icon={page.icon}
				color={page.color}
				label={t(page.label)}
				shortcut={shortcut}
				isActive={isActive}
				onClick={() => onNavigate(page.path)}
			/>
		) : (
			<SidebarNavItem
				key={page.id}
				icon={page.icon}
				color={page.color}
				label={t(page.label)}
				description={t(page.description)}
				shortcut={shortcut}
				isActive={isActive}
				onClick={() => onNavigate(page.path)}
			/>
		);
	};

	return (
		<aside
			className={clsx(
				"relative z-40 flex h-full shrink-0 flex-col overflow-hidden",
				"border-r border-border bg-soft",
				"transition-[width] duration-200 ease-out",
				// Collapsed, it is as wide as the window buttons plus their 12px on each side.
				collapsed ? "w-21" : "w-70",
			)}
		>
			<div className="flex h-full flex-col px-3 pb-3">
				{/* The window buttons sit over this strip, and the window is dragged
				    from it. In full screen macOS hides the buttons and it shrinks. */}
				<div data-chain-drag-region className="-mx-3 h-(--chain-title-bar-height,40px) min-h-3 shrink-0" />

				<div className={clsx("mb-3 flex h-8 items-center gap-2", collapsed ? "justify-center" : "pr-1 pl-3")}>
					{!(collapsed && onToggleCollapse) && (
						<>
							<Logo size={20} className="shrink-0" />
							{!collapsed && (
								<Typography as="span" variant="body" className="whitespace-nowrap font-semibold text-text">
									Lazify
								</Typography>
							)}
						</>
					)}
					{onToggleCollapse && (
						<Tooltip
							content={`${t(collapsed ? translation.Sidebar.Expand : translation.Sidebar.Collapse)}  ${formatCombo(sidebarCombo)}`}
							side="right"
						>
							<button
								type="button"
								aria-label={t(collapsed ? translation.Sidebar.Expand : translation.Sidebar.Collapse)}
								aria-expanded={!collapsed}
								onClick={onToggleCollapse}
								className={clsx(
									"flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
									"text-muted transition-colors hover:bg-bg/40 hover:text-text",
									!collapsed && "ml-auto",
								)}
							>
								<UiIcon name={collapsed ? "sidebar-expand" : "sidebar-collapse"} className="h-4 w-4" />
							</button>
						</Tooltip>
					)}
				</div>

				{/* ── New workflow button ─────────────────── */}
				<Tooltip content={collapsed ? t(translation.Sidebar.StartNewWorkflow) : null} side="right">
					<button
						type="button"
						onClick={onStartWorkflow}
						className={clsx(
							"mb-3 flex items-center gap-3",
							"rounded-lg bg-accent px-3 py-2.5 transition-colors hover:bg-accentHover",
							"text-sm font-medium text-white",
							collapsed && "justify-center px-0",
						)}
						aria-label={t(translation.Sidebar.StartNewWorkflow)}
					>
						<UiIcon name="play" filled className="h-4 w-4 shrink-0 text-white" />
						{/* Forced rather than inherited: the variant carries `text-text`,
                which flips with the theme and would go dark on the accent. */}
						{!collapsed && (
							<>
								<Typography as="span" variant="body" className="whitespace-nowrap text-white!">
									{t(translation.Sidebar.NewWorkflow)}
								</Typography>
								<kbd className="ml-auto font-sans text-xs text-white/70">{formatCombo(newWorkflowCombo)}</kbd>
							</>
						)}
					</button>
				</Tooltip>

				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
					{/* ── Nav ────────────────────────────────── */}
					<nav className="flex flex-col gap-1">
						{!collapsed && (
							<OverlineText className="mb-1 block px-3 whitespace-nowrap text-muted">{t(translation.Sidebar.Main)}</OverlineText>
						)}
						{pages.filter((page) => page !== settingsPage).map(renderPage)}

						<SidebarPinnedTools
							tools={pinnedTools}
							activePath={activePath}
							collapsed={collapsed}
							onNavigate={onNavigate}
						/>
					</nav>

					{!collapsed && (
						<SidebarRecentProjects
							projects={recentProjects}
							openProjectPath={openProjectPath}
							onOpenProject={onOpenProject}
							onAddProject={onStartWorkflow}
						/>
					)}
				</div>

				<section
					aria-label={t(translation.Sidebar.System)}
					className="mt-3 flex flex-col gap-1 border-t border-border pt-3"
				>
					{!collapsed && (
						<OverlineText className="mb-1 block px-3 whitespace-nowrap text-muted">{t(translation.Sidebar.System)}</OverlineText>
					)}
					{settingsPage && renderPage(settingsPage)}
					<Tooltip content={collapsed ? `${t(translation.Sidebar.Theme)}: ${theme}` : null} side="right">
						<button
							type="button"
							onClick={(event) => {
								const row = event.currentTarget.getBoundingClientRect();
								setThemeMenuAt({ x: row.right + 4, y: row.top });
							}}
							className={clsx(
								"flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
								"text-sm text-muted hover:bg-bg/40 hover:text-text",
								collapsed && "justify-center px-0",
							)}
							aria-label={t(translation.Sidebar.Theme)}
							aria-haspopup="menu"
							aria-expanded={themeMenuAt !== null}
						>
							<UiIcon name={theme === "dark" ? "sun" : "moon"} className="h-5 w-5 shrink-0 text-muted" />
							{!collapsed && (
								<>
									<Typography variant="body" className="min-w-0 truncate font-medium text-inherit">
										{t(translation.Sidebar.Theme)}
									</Typography>
									<UiIcon name="arrow-right" className="ml-auto h-4 w-4 shrink-0 text-muted" />
								</>
							)}
						</button>
					</Tooltip>
					<ContextMenu
						position={themeMenuAt}
						items={themeChoices.map(({ preference, label, icon }) => ({
							key: preference,
							label: t(label),
							icon,
							selected: preference === themePreference,
							onSelect: () => onThemeChange(preference),
						}))}
						onClose={() => setThemeMenuAt(null)}
					/>
				</section>
			</div>
		</aside>
	);
}
