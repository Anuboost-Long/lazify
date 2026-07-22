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
}: SourceModeCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative overflow-hidden rounded-[28px] border p-6 text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1",
        active
          ? "border-accent bg-accent-gradient-135 shadow-panel"
          : "border-border bg-soft hover:border-accent"
      )}
    >
      {active ? <SelectionRail /> : null}

      <CardShapes variant={icon === "play" ? 0 : 2} />

      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--color-accent), transparent)"
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={clsx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border transition-[transform,box-shadow] duration-300",
            "group-hover:-rotate-3 group-hover:scale-105",
            active
              ? "border-accent/25 bg-accent/10 text-accent ring-1 ring-accent/25"
              : "border-border bg-bg text-muted group-hover:border-accent/20 group-hover:text-accent"
          )}
        >
          <UiIcon name={icon} className="h-7 w-7" />
        </div>

        <PillText
          className={clsx(
            "rounded-full border px-3 py-1 tracking-[0.22em]",
            active
              ? "border-accent/20 bg-accent/10 text-accent"
              : "border-border bg-bg text-muted"
          )}
        >
          {active ? t(translation.SourceModeCard.ActiveMode) : t(translation.SourceModeCard.ClickToChoose)}
        </PillText>
      </div>

      <div className="relative mt-5">
        <OverlineText className="text-[11px]">
          {eyebrow}
        </OverlineText>
        <CardTitle className="mt-2 text-xl">{title}</CardTitle>
        <BodyText tone="muted" className="mt-3 leading-6">{description}</BodyText>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4 rounded-[20px] border border-border/80 bg-bg/75 px-4 py-3">
        <div>
          <CaptionText className="font-semibold uppercase tracking-[0.22em]">
            {t(translation.SourceModeCard.Flow)}
          </CaptionText>
          <BodyText className="mt-1">{metadata}</BodyText>
        </div>
        <UiIcon
          name="arrow-right"
          className={clsx(
            "h-5 w-5 shrink-0 transition-transform duration-200",
            active ? "text-accent" : "text-muted group-hover:translate-x-1 group-hover:text-accent"
          )}
        />
      </div>
    </button>
  );
}
