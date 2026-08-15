import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { MonoText, PillText, SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface StatusTileProps {
  icon: UiIconName;
  label: string;
  value: string;
  title?: string;
  /** Sizes and formats are data; a description of the layout is not. */
  mono?: boolean;
  /** Staggers the reveal, so the row lands as a sequence rather than a block. */
  delayMs: number;
}

/** One compact fact about the picked bundle. */
export function StatusTile({
  icon,
  label,
  value,
  title,
  mono = true,
  delayMs
}: StatusTileProps) {
  const { t } = useTranslation();

  return (
    <div
      title={title}
      style={{ animationDelay: `${delayMs}ms` }}
      className={clsx(
        "flex items-center gap-2.5 overflow-hidden",
        "rounded-xl border border-border bg-bg px-3 py-2.5",
        "animate-fadeIn"
      )}
    >
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center",
          "border border-border rounded-xl bg-soft text-muted"
        )}
      >
        <UiIcon name={icon} className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0">
        <PillText as="span" className="block !text-muted">
          {t(label)}
        </PillText>
        {mono ? (
          <MonoText as="span" className="block truncate text-xs text-text">
            {value}
          </MonoText>
        ) : (
          <SmallText as="span" className="block truncate !text-text">
            {value}
          </SmallText>
        )}
      </span>
    </div>
  );
}
