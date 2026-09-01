import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import type { PickedImage } from "../hooks/use-dmg-compiler";
import { ImageSlot } from "./ImageSlot";
import { WindowPreview } from "./WindowPreview";

interface WindowDesignSectionProps {
	volumeName: string;
	appName: string;
	appIconUrl: string | null;
	background: PickedImage | null;
	volumeIcon: PickedImage | null;
	disabled: boolean;
	onChoose: (kind: "background" | "icon") => void;
	onClear: (kind: "background" | "icon") => void;
}

/**
 * How the mounted disk looks: the two images, and what they add up to.
 *
 * Sits below the two required fields and above the build button — it is the
 * part of the build that is a choice rather than an answer, and a build with
 * neither image picked is still a good build.
 */
export function WindowDesignSection({
	volumeName,
	appName,
	appIconUrl,
	background,
	volumeIcon,
	disabled,
	onChoose,
	onClear,
}: Readonly<WindowDesignSectionProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-4 border-t border-border/70 pt-4">
			<div className="flex flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<UiIcon name="multi-window" className="h-3 w-3 shrink-0 text-muted" />
					<OverlineText className="!text-muted">{t(translation.DmgCompiler.WindowSection)}</OverlineText>
				</div>
				<CaptionText tone="muted" className="leading-relaxed">
					{t(translation.DmgCompiler.WindowSectionHint)}
				</CaptionText>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
				<div className="flex flex-col gap-4">
					<ImageSlot
						icon="media-image"
						label={translation.DmgCompiler.BackgroundLabel}
						hint={translation.DmgCompiler.BackgroundHint}
						image={background}
						fallbackLabel={translation.DmgCompiler.ImageNone}
						disabled={disabled}
						onChoose={() => onChoose("background")}
						onClear={() => onClear("background")}
					/>

					<ImageSlot
						icon="hard-drive"
						label={translation.DmgCompiler.VolumeIconLabel}
						hint={translation.DmgCompiler.VolumeIconHint}
						image={volumeIcon}
						fallbackUrl={appIconUrl}
						fallbackLabel={translation.DmgCompiler.ImageDefault}
						disabled={disabled}
						onChoose={() => onChoose("icon")}
						onClear={() => onClear("icon")}
					/>
				</div>

				<WindowPreview
					volumeName={volumeName}
					appName={appName}
					appIconUrl={appIconUrl}
					backgroundUrl={background?.previewUrl ?? null}
					volumeIconUrl={volumeIcon?.previewUrl ?? null}
				/>
			</div>
		</div>
	);
}
