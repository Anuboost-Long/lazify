import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import type {
	FormatMode,
	FormatOutcome,
	FormatterDefaults,
	FormatterSettings,
} from "@main/formatting";

/**
 * The formatter's settings, shared by everything that reads them.
 *
 * Held in one atom rather than fetched per component: the settings page and the
 * changes panel both show the mode, and two copies would disagree the moment
 * one of them changed it.
 */
const settingsAtom = atom<FormatterSettings | null>(null);

let requested = false;

export function useFormatterSettings() {
	const [settings, setSettings] = useAtom(settingsAtom);

	useEffect(() => {
		if (requested) return;
		requested = true;

		void globalThis.lazify.formatterSettings().then(setSettings);
	}, [setSettings]);

	return {
		settings,
		mode: settings?.mode ?? "manual",
		organizeImports: settings?.organizeImports ?? true,
		defaults: settings?.defaults ?? null,
		setMode: useCallback(
			(mode: FormatMode) => {
				void globalThis.lazify.setFormatterMode(mode).then(setSettings);
			},
			[setSettings],
		),
		setOrganizeImports: useCallback(
			(enabled: boolean) => {
				void globalThis.lazify.setOrganizeImports(enabled).then(setSettings);
			},
			[setSettings],
		),
		setDefaults: useCallback(
			(defaults: Partial<FormatterDefaults>) => {
				void globalThis.lazify.setFormatterDefaults(defaults).then(setSettings);
			},
			[setSettings],
		),
	};
}

/**
 * Formatting one project on demand, and the result of the last pass — whether
 * this component asked for it or the automatic pass did it after a turn.
 */
export function useProjectFormatter(projectPath: string) {
	const [busy, setBusy] = useState(false);
	const [outcome, setOutcome] = useState<FormatOutcome | null>(null);
	const [configFile, setConfigFile] = useState<string | null>(null);

	useEffect(() => {
		setOutcome(null);

		if (!projectPath) return;

		void globalThis.lazify
			.projectFormatter(projectPath)
			.then((formatter) => setConfigFile(formatter.configFile))
			.catch(() => setConfigFile(null));
	}, [projectPath]);

	useEffect(() => {
		return globalThis.lazify.onCodeFormatted((event) => {
			if (event.projectPath === projectPath) setOutcome(event);
		});
	}, [projectPath]);

	const run = useCallback(
		async (mode: "write" | "preview") => {
			if (!projectPath) return null;

			setBusy(true);
			try {
				const result = await globalThis.lazify.formatChangedFiles(projectPath, undefined, mode);

				setConfigFile(result.configFile);
				// A preview is a question, not an answer — leaving the last outcome
				// standing keeps the panel reporting the run that actually happened.
				if (mode === "write") setOutcome(result);

				return result;
			} finally {
				setBusy(false);
			}
		},
		[projectPath],
	);

	return {
		busy,
		outcome,
		configFile,
		preview: useCallback(() => run("preview"), [run]),
		format: useCallback(() => run("write"), [run]),
	};
}
