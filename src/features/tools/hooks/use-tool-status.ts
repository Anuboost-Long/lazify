import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { formatDate, useDateTimeFormat } from "@/shared/hooks/use-date-time-format";
import { readLastDmgBuild } from "@/shared/lib/dmg/last-build";

import { apiStudioTool, dmgCompilerTool, environmentTool, promptBuilderTool } from "../catalog";

interface StatusProject {
	path: string;
	name: string;
}

/**
 * One line of live state per tool, keyed by tool id, so the drawer says
 * something before a tool is opened. A line that can't be read is left out
 * rather than shown as an error: the tile still opens the tool.
 */
export function useToolStatus(project: StatusProject | null): Partial<Record<string, string>> {
	const { t } = useTranslation();
	const { dateFormat } = useDateTimeFormat();
	const [status, setStatus] = useState<Partial<Record<string, string>>>({});
	const projectPath = project?.path;
	const projectName = project?.name;

	useEffect(() => {
		if (!globalThis.lazify) return;

		let cancelled = false;
		const show = (toolId: string, line: string | null) => {
			if (!cancelled && line) setStatus((current) => ({ ...current, [toolId]: line }));
		};

		globalThis.lazify.listPromptPresets().then(
			(presets) => show(promptBuilderTool.id, t(translation.Tools.StatusPresets, { count: presets.length })),
			() => undefined,
		);

		if (projectPath && projectName) {
			globalThis.lazify.readApiCollections(projectPath).then(
				(collections) =>
					show(
						apiStudioTool.id,
						t(translation.Tools.StatusCollections, { count: collections.length, project: projectName }),
					),
				() => undefined,
			);
		}

		void Promise.allSettled([globalThis.lazify.checkEnvironment(), globalThis.lazify.listListeningProcesses()]).then(
			([environment, ports]) => {
				const parts: string[] = [];
				if (environment.status === "fulfilled" && environment.value.nodeVersion) {
					parts.push(t(translation.Tools.StatusNode, { version: environment.value.nodeVersion.replace(/^v/, "") }));
				}
				if (ports.status === "fulfilled") {
					parts.push(t(translation.Tools.StatusPorts, { count: ports.value.length }));
				}
				show(environmentTool.id, parts.join(" · ") || null);
			},
		);

		const lastBuild = readLastDmgBuild();
		if (lastBuild) {
			show(
				dmgCompilerTool.id,
				t(translation.Tools.StatusLastDmg, {
					name: lastBuild.appName,
					date: formatDate(new Date(lastBuild.builtAt), dateFormat),
				}),
			);
		}

		return () => {
			cancelled = true;
		};
	}, [projectPath, projectName, t, dateFormat]);

	return status;
}
