import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export interface SegmentedTab<TId extends string> {
  id: TId;
  /** Translation key — the control calls t() itself. */
  label: string;
  icon: UiIconName;
  /** Shown as a count beside the label, when there is one worth showing. */
  badge?: number;
}

interface SegmentedTabsProps<TId extends string> {
  tabs: SegmentedTab<TId>[];
  active: TId;
  onSelect: (id: TId) => void;
}

/**
 * A segmented control that reads as one object rather than a row of buttons:
 * the track is a single pill, and the active segment lifts out of it with the
 * app's accent and a filled icon.
 */
export function SegmentedTabs<TId extends string>({
  tabs,
  active,
  onSelect
}: Readonly<SegmentedTabsProps<TId>>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-soft p-1">
      {tabs.map((tab) => {
        const selected = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-pressed={selected}
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors",
              selected
                ? "bg-accent/[0.14] text-accent shadow-sm"
                : "text-muted hover:bg-text/[0.04] hover:text-text"
            )}
          >
            <UiIcon name={tab.icon} filled={selected} className="h-3.5 w-3.5" />
            <SmallText className={clsx(selected ? "!text-accent" : "!text-inherit")}>
              {t(tab.label)}
            </SmallText>

            {tab.badge ? (
              <span
                className={clsx(
                  "rounded-full px-1.5 text-[10px] font-semibold leading-4",
                  selected ? "bg-accent/20 text-accent" : "bg-text/[0.08] text-muted"
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
