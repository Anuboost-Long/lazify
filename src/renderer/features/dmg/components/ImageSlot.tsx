import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SmallText } from "@renderer/shared/typography";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { PickedImage } from "../hooks/use-dmg-compiler";
import { Field } from "./Field";

interface ImageSlotProps {
  icon: UiIconName;
  label: string;
  hint: string;
  image: PickedImage | null;
  /** Drawn when nothing is picked — the app's own icon, for the icon slot. */
  fallbackUrl?: string | null;
  /** What the build will use instead, said plainly. */
  fallbackLabel: string;
  disabled: boolean;
  onChoose: () => void;
  onClear: () => void;
}

/** The tail of a path, for naming a picked file without the folders above it. */
function fileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

/**
 * One of the two images the mounted window can be dressed with.
 *
 * Shows the thumbnail rather than just the path: these are pictures, and a row
 * of monospaced filenames would make the one screen whose job is appearance the
 * one screen that shows none of it.
 */
export function ImageSlot({
  icon,
  label,
  hint,
  image,
  fallbackUrl,
  fallbackLabel,
  disabled,
  onChoose,
  onClear
}: ImageSlotProps) {
  const { t } = useTranslation();
  const preview = image?.previewUrl ?? (image ? null : fallbackUrl);

  return (
    <Field icon={icon} label={label} hint={hint}>
      {/* Same chrome as the fields above, so a picked image reads as a value
          sitting in a control rather than as a card of its own. */}
      <div className={clsx("flex items-center gap-2.5", fieldChromeClassName("default", "sm"))}>
        <span
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden",
            "border border-border rounded-lg bg-soft text-muted"
          )}
        >
          {preview ? (
            <img
              src={preview}
              alt=""
              draggable={false}
              // Dimmed while it is only standing in for what a pick would
              // replace, so the slot reads as empty at a glance.
              className={clsx("h-full w-full object-cover", !image && "opacity-45")}
            />
          ) : (
            <UiIcon name="media-image" className="h-3.5 w-3.5" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          {image ? (
            <MonoText as="span" className="block truncate text-[11px] text-text">
              {fileName(image.path)}
            </MonoText>
          ) : (
            <SmallText as="span" className="block truncate !text-muted">
              {t(fallbackLabel)}
            </SmallText>
          )}

          {image && !image.previewUrl ? (
            <CaptionText tone="muted" className="block">
              {t(translation.DmgCompiler.ImageUnreadable)}
            </CaptionText>
          ) : null}
        </span>

        <LabelButton
          label={image ? translation.DmgCompiler.ImageReplace : translation.DmgCompiler.ImageChoose}
          onClick={onChoose}
          disabled={disabled}
        />

        {image ? (
          <LabelButton
            label={translation.DmgCompiler.ImageClear}
            onClick={onClear}
            disabled={disabled}
          />
        ) : null}
      </div>
    </Field>
  );
}
