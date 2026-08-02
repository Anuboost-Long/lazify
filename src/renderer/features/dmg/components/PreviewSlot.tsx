import clsx from "clsx";

import { PillText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface PreviewSlotProps {
  /** Distance across the window, as the CSS percentage the build also uses. */
  left: string;
  iconUrl: string | null;
  fallbackIcon: UiIconName;
  caption: string;
}

/**
 * One icon in the preview window, placed by the same fractions the build uses.
 *
 * Its own file rather than nested in `WindowPreview`: a component declared
 * inside another is a new type on every render, and React would throw away the
 * `<img>` and reload it each time the volume name field is typed in.
 */
export function PreviewSlot({ left, iconUrl, fallbackIcon, caption }: PreviewSlotProps) {
  return (
    <div
      style={{ left, top: "46%" }}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          className="h-12 w-12 object-contain drop-shadow-sm"
        />
      ) : (
        <span
          className={clsx(
            "flex h-12 w-12 items-center justify-center",
            "border border-border rounded-2xl bg-bg/80 text-muted"
          )}
        >
          <UiIcon name={fallbackIcon} className="h-5 w-5" />
        </span>
      )}

      {/* A chip rather than bare text: the label sits on artwork this page has
          never seen, and unreadable is the one thing it must not be. */}
      <PillText
        as="span"
        className={clsx(
          "max-w-[104px] truncate rounded px-1.5 py-0.5",
          "bg-bg/80 !text-text backdrop-blur-[2px]"
        )}
      >
        {caption}
      </PillText>
    </div>
  );
}
