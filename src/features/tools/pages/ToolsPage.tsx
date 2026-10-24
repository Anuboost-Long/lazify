import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { translation } from "@/i18n/translation";
import { activeProjectPathAtom, syncedWorkspaceProjectsAtom } from "@/shared/hooks/lazify-store/atoms";
import { CaptionText, CardTitle } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

import { availableTools } from "../catalog";
import { usePinnedTools } from "../hooks/use-pinned-tools";
import { useToolStatus } from "../hooks/use-tool-status";
import { toolColorVars } from "../lib/tool-colors";

/**
 * The app drawer for tools.
 *
 * Everything here is a self-contained job that is not part of the day-to-day
 * flow — the drawer stays short, and a tool arrives as a tile rather than a
 * permanent entry nobody uses twice unless it earns a pinned shortcut. Each
 * tile's icon carries the tool's own colour, so the grid is found by hue rather
 * than read line by line, while the tiles themselves stay one neutral surface.
 */
export function ToolsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const tools = availableTools(globalThis.lazify?.platform ?? "");
	const { pinnedToolIds, togglePinnedTool } = usePinnedTools();
	const activeProjectPath = useAtomValue(activeProjectPathAtom);
	const activeProject = useAtomValue(syncedWorkspaceProjectsAtom).find(
		(project) => project.projectPath === activeProjectPath,
	);
	const status = useToolStatus(
		activeProject ? { path: activeProject.projectPath, name: activeProject.projectName } : null,
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
				{tools.map((tool) => {
					const pinned = pinnedToolIds.includes(tool.id);

					return (
						<article
							key={tool.id}
							style={toolColorVars(tool)}
							className={clsx(
								"group relative overflow-hidden rounded-2xl",
								"bg-soft",
								"border border-border",
								"transition-colors duration-150 hover:border-(--tool-border)",
							)}
						>
							<button
								type="button"
								onClick={() => navigate(tool.path)}
								className={clsx(
									"flex h-full w-full flex-col items-start gap-3 rounded-2xl",
									"text-left",
									"p-4",
									"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
								)}
							>
								<span
									className={clsx(
										"flex h-10 w-10 items-center justify-center rounded-xl",
										"bg-(--tool-icon) text-(--tool)",
									)}
								>
									<UiIcon name={tool.icon} className="h-5 w-5" />
								</span>

								<div className="min-w-0 pr-7">
									<CardTitle className="text-text! block truncate">{t(tool.label)}</CardTitle>
									<CaptionText tone="muted" className="mt-1 block leading-5">
										{t(tool.description)}
									</CaptionText>
								</div>

								<p
									className={clsx(
										"mt-auto w-full truncate",
										"border-t border-border",
										"text-xs font-medium text-text",
										"pt-3",
									)}
								>
									{status[tool.id] ?? "\u00a0"}
								</p>
							</button>

							<Tooltip
								content={t(pinned ? translation.Tools.UnpinFromDrawer : translation.Tools.PinToDrawer, {
									tool: t(tool.label),
								})}
								side="left"
							>
								<button
									type="button"
									aria-pressed={pinned}
									aria-label={t(pinned ? translation.Tools.UnpinFromDrawer : translation.Tools.PinToDrawer, {
										tool: t(tool.label),
									})}
									onClick={() => togglePinnedTool(tool.id)}
									className={clsx(
										"absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg",
										"transition-[opacity,color]",
										"focus-visible:outline-2 focus-visible:outline-accent",
										pinned
											? "text-(--tool)"
											: "text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-(--tool)",
									)}
								>
									<UiIcon name="pin" filled={pinned} className="h-4 w-4" />
								</button>
							</Tooltip>
						</article>
					);
				})}
			</div>
		</div>
	);
}
