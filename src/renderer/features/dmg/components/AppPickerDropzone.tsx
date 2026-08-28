import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { dmgCompilerTool } from "@renderer/features/tools/catalog";
import { toolColorVars } from "@renderer/features/tools/lib/tool-colors";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, CardTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { FlowHint } from "./FlowHint";

interface AppPickerDropzoneProps {
	dragging: boolean;
	onChoose: () => void;
}

/**
 * Nothing picked yet.
 *
 * A bounded, dashed target rather than text floating in an open panel: the one
 * thing this state has to say is "the app goes here", and a drop target that
 * does not look like one says it badly.
 */
export function AppPickerDropzone({ dragging, onChoose }: Readonly<AppPickerDropzoneProps>) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={onChoose}
			style={toolColorVars(dmgCompilerTool)}
			className={clsx(
				"flex w-full flex-col items-center justify-center gap-3",
				"min-h-[220px] rounded-2xl border border-dashed px-6 py-8 text-center",
				"outline-none transition-colors duration-200",
				"focus-visible:ring-2 focus-visible:ring-accent/60",
				dragging
					? "border-[var(--tool)] bg-[var(--tool-tile)]"
					: "border-border hover:border-[var(--tool-border)] hover:bg-[var(--tool-tile)]",
			)}
		>
			<span
				className={clsx(
					"flex h-12 w-12 items-center justify-center rounded-2xl",
					"bg-[var(--tool-icon)] text-[var(--tool)] transition-transform duration-200",
					dragging && "scale-105",
				)}
			>
				<UiIcon name={dragging ? "package" : "hard-drive"} filled={dragging} className="h-5 w-5" />
			</span>

			<div className="flex flex-col items-center gap-1">
				<CardTitle className="!text-text">
					{t(dragging ? translation.DmgCompiler.DropNow : translation.DmgCompiler.ChooseApp)}
				</CardTitle>

				<CaptionText tone="muted" className="max-w-sm leading-6">
					{t(translation.DmgCompiler.ChooseAppHint)}
				</CaptionText>
			</div>

			<FlowHint />
		</button>
	);
}
