import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { pauseShortcuts, useShortcuts } from "@/shared/hooks/use-shortcuts";
import {
	comboFromEvent,
	formatCombo,
	isMac,
	shortcutProblem,
	shortcuts,
	type ShortcutId,
	type ShortcutProblem,
} from "@/shared/lib/shortcuts";
import { BodyText, SmallText } from "@/shared/typography";

import { SectionLabel } from "./SectionLabel";

const rowButton = clsx(
	"h-8 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors",
	"hover:bg-bg hover:text-text",
);

export function KeyboardSection() {
	const { t } = useTranslation();
	const { bindings, overrides, change, reset, resetAll } = useShortcuts();
	const [recording, setRecording] = useState<ShortcutId | null>(null);
	const [problem, setProblem] = useState<{ combo: string; issue: ShortcutProblem } | null>(null);

	function startRecording(id: ShortcutId) {
		setRecording(id);
		setProblem(null);
	}

	function stopRecording() {
		setRecording(null);
		setProblem(null);
	}

	function problemMessage({ combo, issue }: { combo: string; issue: ShortcutProblem }) {
		switch (issue.kind) {
			case "no-modifier":
				return t(translation.Settings.ShortcutNoModifier, { modifiers: isMac ? "⌘, ⌃ or ⌥" : "Ctrl or Alt" });
			case "reserved":
				return t(translation.Settings.ShortcutReserved, { combo: formatCombo(combo) });
			case "taken": {
				const taken = shortcuts.find((shortcut) => shortcut.id === issue.by);
				return t(translation.Settings.ShortcutTaken, {
					combo: formatCombo(combo),
					action: taken ? t(taken.label) : "",
				});
			}
		}
	}

	useEffect(() => {
		if (!recording) return;
		const id = recording;
		pauseShortcuts(true);
		function capture(event: KeyboardEvent) {
			const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
			if (event.key === "Tab" && plain) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			if (event.key === "Escape" && plain) {
				stopRecording();
				return;
			}
			const combo = comboFromEvent(event);
			if (!combo) return;
			const issue = shortcutProblem(id, combo, bindings);
			if (issue) {
				setProblem({ combo, issue });
				return;
			}
			stopRecording();
			change(id, combo);
		}
		globalThis.addEventListener("keydown", capture, true);
		return () => {
			pauseShortcuts(false);
			globalThis.removeEventListener("keydown", capture, true);
		};
	});

	return (
		<div className="flex flex-col gap-4">
			<div>
				<SectionLabel>{t(translation.Settings.KeyboardShortcuts)}</SectionLabel>
				<SmallText className="-mt-2 leading-5">{t(translation.Settings.KeyboardShortcutsDesc)}</SmallText>
			</div>

			<ul className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
				{shortcuts.map(({ id, label }) => {
					const active = recording === id;
					const action = t(label);

					return (
						<li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
							<BodyText as="span" className="min-w-0 flex-1 font-semibold">
								{action}
							</BodyText>
							{active ? (
								<output className="text-xs text-muted">{t(translation.Settings.PressNewKeys)}</output>
							) : (
								<kbd
									className={clsx(
										"inline-flex h-7 min-w-7 items-center justify-center px-2",
										"rounded-md border border-border bg-bg",
										"font-mono text-xs text-text",
									)}
								>
									{formatCombo(bindings[id])}
								</kbd>
							)}
							<button
								type="button"
								aria-label={t(
									active ? translation.Settings.CancelShortcutLabel : translation.Settings.ChangeShortcutLabel,
									{ action },
								)}
								onClick={() => (active ? stopRecording() : startRecording(id))}
								className={rowButton}
							>
								{t(active ? translation.GlobalTerm.Cancel : translation.Settings.ChangeShortcut)}
							</button>
							{overrides[id] && !active && (
								<button
									type="button"
									aria-label={t(translation.Settings.ResetShortcutLabel, { action })}
									onClick={() => reset(id)}
									className={rowButton}
								>
									{t(translation.Settings.ResetShortcut)}
								</button>
							)}
							{active && problem && (
								<SmallText role="alert" tone="error" className="w-full">
									{problemMessage(problem)}
								</SmallText>
							)}
						</li>
					);
				})}
			</ul>

			{Object.keys(overrides).length > 0 && (
				<button
					type="button"
					onClick={() => {
						stopRecording();
						resetAll();
					}}
					className={clsx(
						"h-8 self-start rounded-lg border border-border px-3",
						"text-xs font-medium text-text transition-colors hover:border-accent/40",
					)}
				>
					{t(translation.Settings.ResetAllShortcuts)}
				</button>
			)}
		</div>
	);
}
