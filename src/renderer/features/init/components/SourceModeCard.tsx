import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, CaptionText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SelectionRail } from "@renderer/shared/ui/card/SelectionRail";
import { useTranslation } from "react-i18next";

interface SourceModeCardProps {
  active: boolean;
  icon: "play" | "import";
  eyebrow: string;
  title: string;
  description: string;
  metadata: string;
  onClick: () => void;
}

export function SourceModeCard({
  active,
  icon,
  eyebrow,
  title,
  description,
  metadata,
  onClick
}: Readonly<SourceModeCardProps>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "group relative overflow-hidden rounded-[20px] border p-4 text-left",
        "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5",
        active
          ? "border-accent bg-accent-gradient-135 shadow-panel"
          : "border-border bg-soft hover:border-accent/70 hover:shadow-panel"
      )}
    >
      {active ? <SelectionRail /> : null}

      <CardShapes variant={icon === "play" ? 0 : 2} />

      <div className="relative flex items-center gap-3">
        <div
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border",
            "transition-[transform,box-shadow] duration-300",
            "group-hover:-rotate-3 group-hover:scale-105",
            active
              ? "border-accent/25 bg-accent/10 text-accent ring-1 ring-accent/25"
              : "border-border bg-bg text-muted group-hover:border-accent/20 group-hover:text-accent"
          )}
        >
          <UiIcon name={icon} className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <OverlineText className="truncate text-[10px] tracking-[0.18em]">
              {eyebrow}
            </OverlineText>
            {active ? (
              <PillText
                tone="accent"
                className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5"
              >
                {t(translation.SourceModeCard.ActiveMode)}
              </PillText>
            ) : null}
          </div>
          <CardTitle className="mt-1 truncate text-base">{title}</CardTitle>
          <BodyText tone="muted" className="mt-1 text-sm leading-5">
            {description}
          </BodyText>
          <CaptionText className="mt-1.5 truncate font-medium text-muted">
            {metadata}
          </CaptionText>
        </div>

        <UiIcon
          name={active ? "check-circle" : "arrow-right"}
          className={clsx(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            active
              ? "text-accent"
              : "text-muted group-hover:translate-x-1 group-hover:text-accent"
          )}
        />
      </div>
    </button>
  );
}
