import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText } from "@renderer/shared/typography";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { TextInput, fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { useDmgCompiler } from "../hooks/use-dmg-compiler";
import type { AppBundleInfo } from "../hooks/use-dmg-compiler";
import { BuildProgress } from "./BuildProgress";
import { Field } from "./Field";
import { WindowDesignSection } from "./WindowDesignSection";

/** Everything the page needs from the hook, minus what the shell handles. */
type Compiler = ReturnType<typeof useDmgCompiler>;

interface BuildFormProps extends
  Pick<
    Compiler,
    | "volumeName"
    | "setVolumeName"
    | "outputPath"
    | "background"
    | "volumeIcon"
    | "building"
    | "result"
    | "error"
    | "chooseDestination"
    | "chooseImage"
    | "clearImage"
    | "build"
    | "reset"
  > {
  app: AppBundleInfo;
  /** Which build step is running, for the track. */
  step: string;
}

/** Naming, destination, appearance and the button, once an app is picked. */
export function BuildForm({
  app,
  step,
  volumeName,
  setVolumeName,
  outputPath,
  background,
  volumeIcon,
  building,
  result,
  error,
  chooseDestination,
  chooseImage,
  clearImage,
  build,
  reset
}: BuildFormProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon="settings"
          label={translation.DmgCompiler.VolumeName}
          hint={translation.DmgCompiler.VolumeNameHint}
        >
          <TextInput
            size="sm"
            value={volumeName}
            disabled={building}
            onChange={(event) => setVolumeName(event.target.value)}
            placeholder={app.name}
            aria-label={t(translation.DmgCompiler.VolumeName)}
          />
        </Field>

        <Field
          icon="folder"
          label={translation.DmgCompiler.Destination}
          hint={translation.DmgCompiler.DestinationHint}
        >
          {/* The whole row opens the save dialog: the path is the control, so
              making it the target beats parking a button beside something that
              looks clickable already. */}
          <Tooltip content={outputPath} side="top">
            <button
              type="button"
              onClick={() => void chooseDestination()}
              disabled={building}
              className={clsx(
                "flex w-full items-center gap-2",
                // Borrowed from the input chrome rather than restated, so this
                // row and the volume-name field beside it cannot drift apart.
                fieldChromeClassName("default", "sm"),
                // Only the fade eases. The hover tint is deliberately instant:
                // this row is a control, and a colour crawling in behind the
                // pointer reads as lag rather than as polish.
                "text-left transition-[opacity] duration-200",
                building
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-accent/40 hover:bg-accent/[0.04]"
              )}
            >
              <MonoText as="span" className="min-w-0 flex-1 truncate text-[11px] text-text">
                {outputPath}
              </MonoText>
              <UiIcon name="folder-plus" className="h-3.5 w-3.5 shrink-0 text-muted" />
            </button>
          </Tooltip>
        </Field>
      </div>

      <WindowDesignSection
        volumeName={volumeName || app.name}
        appName={app.name}
        appIconUrl={app.iconDataUrl}
        background={background}
        volumeIcon={volumeIcon}
        disabled={building}
        onChoose={(kind) => void chooseImage(kind)}
        onClear={clearImage}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
        <LabelButton
          label={translation.DmgCompiler.Build}
          icon="hard-drive"
          variant="accent"
          loading={building}
          disabled={building || !outputPath}
          onClick={() => void build()}
        />

        {!building && (result || error) ? (
          <LabelButton label={translation.DmgCompiler.StartOver} onClick={reset} />
        ) : null}

        {!building && !result ? (
          <CaptionText tone="muted" className="ml-auto">
            {t(translation.DmgCompiler.DropHintShort)}
          </CaptionText>
        ) : null}
      </div>

      {building ? <BuildProgress step={step} /> : null}
    </div>
  );
}
