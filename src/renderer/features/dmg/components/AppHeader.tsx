import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { AppBundleInfo } from "../hooks/use-dmg-compiler";

interface AppHeaderProps {
  app: AppBundleInfo | null;
  building: boolean;
  onChangeApp: () => void;
}

/**
 * Who is being packaged.
 *
 * Shows the app's *own* icon once one is picked. That is the point of the
 * screen: the only real mistake it can make is packaging the wrong bundle, and
 * a generic placeholder makes every app look like every other app.
 */
export function AppHeader({ app, building, onChangeApp }: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="relative flex items-start gap-4">
      <span
        className={clsx(
          "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden",
          "rounded-2xl border",
          // The chip changes shape *and* palette when an app lands — accent
          // placeholder to neutral icon frame — so the colours ease with the
          // rotation rather than cutting to the new state.
          "transition-[transform,border-color,background-color,color] duration-300",
          "group-hover:-rotate-2 group-hover:scale-[1.03]",
          app?.iconDataUrl
            ? "border-border bg-bg"
            : "border-accent/25 bg-accent/10 text-accent ring-1 ring-accent/20"
        )}
      >
        {app?.iconDataUrl ? (
          <img src={app.iconDataUrl} alt="" draggable={false} className="h-12 w-12 object-contain" />
        ) : (
          <UiIcon name={app ? "package" : "hard-drive"} className="h-6 w-6" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <OverlineText className="text-[11px]">{t(translation.DmgCompiler.Eyebrow)}</OverlineText>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <CardTitle className="truncate">
            {app ? app.name : t(translation.DmgCompiler.Title)}
          </CardTitle>

          {app?.version ? (
            <PillText
              as="span"
              className="border border-accent/20 rounded-full bg-accent/10 px-2 py-0.5 !text-accent"
            >
              {app.version}
            </PillText>
          ) : null}
        </div>

        {app ? (
          <CaptionText tone="muted" className="mt-1 block truncate" title={app.appPath}>
            {app.appPath}
          </CaptionText>
        ) : (
          <BodyText tone="muted" className="mt-1.5 leading-relaxed">
            {t(translation.DmgCompiler.Description)}
          </BodyText>
        )}
      </div>

      {app ? (
        <LabelButton
          label={translation.DmgCompiler.ChangeApp}
          onClick={onChangeApp}
          disabled={building}
          className="shrink-0"
        />
      ) : null}
    </header>
  );
}
