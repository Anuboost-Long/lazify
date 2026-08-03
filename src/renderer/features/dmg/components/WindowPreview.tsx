import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { PreviewSlot } from "./PreviewSlot";

interface WindowPreviewProps {
  volumeName: string;
  appName: string;
  appIconUrl: string | null;
  backgroundUrl: string | null;
  volumeIconUrl: string | null;
}

/**
 * The window the finished image opens as.
 *
 * The positions here are the ones the build actually writes — 26% and 74%
 * across, 46% down — so this is a preview rather than an impression. Keep the
 * two in step: the same numbers live in `windowLayout` in `dmg-compiler.ts`.
 */
export function WindowPreview({
  volumeName,
  appName,
  appIconUrl,
  backgroundUrl,
  volumeIconUrl
}: WindowPreviewProps) {
  const { t } = useTranslation();
  const diskIcon = volumeIconUrl ?? appIconUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <UiIcon name="multi-window" className="h-3 w-3 shrink-0 text-muted" />
        <PillText as="span" className="!text-muted">
          {t(translation.DmgCompiler.PreviewLabel)}
        </PillText>
      </div>

      <div className="overflow-hidden border border-border rounded-xl bg-bg shadow-panel">
        {/* Title bar. Traffic lights in the border colour rather than in red,
            amber and green — this is a diagram of a window, not a copy of one. */}
        <div className="flex items-center gap-2 border-b border-border bg-soft px-2.5 py-1.5">
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-2 w-2 rounded-full bg-border" />
            ))}
          </span>

          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
            {diskIcon ? (
              <img src={diskIcon} alt="" draggable={false} className="h-3.5 w-3.5 object-contain" />
            ) : (
              <UiIcon name="hard-drive" className="h-3 w-3 shrink-0 text-muted" />
            )}
            <PillText as="span" className="truncate !text-text">
              {volumeName}
            </PillText>
          </span>

          {/* Balances the traffic lights so the title lands centred. */}
          <span aria-hidden className="w-[26px]" />
        </div>

        <div className="relative">
          {backgroundUrl ? (
            // The image sets the height, which is exactly what it does in the
            // real window: its pixel size becomes the window's size.
            <img src={backgroundUrl} alt="" draggable={false} className="block w-full" />
          ) : (
            <div className="aspect-[660/400] w-full bg-soft" />
          )}

          <PreviewSlot left="26%" iconUrl={appIconUrl} fallbackIcon="package" caption={appName} />

          {/* Only without a backdrop: artwork for a DMG almost always draws its
              own arrow, and two of them is worse than none. */}
          {!backgroundUrl ? (
            <UiIcon
              name="arrow-right"
              className="absolute left-1/2 top-[46%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-muted/50"
            />
          ) : null}

          <PreviewSlot
            left="74%"
            iconUrl={null}
            fallbackIcon="folder"
            caption={t(translation.DmgCompiler.PreviewApplications)}
          />
        </div>
      </div>

      <CaptionText tone="muted" className="leading-relaxed">
        {t(translation.DmgCompiler.PreviewCaption)}
      </CaptionText>
    </div>
  );
}
