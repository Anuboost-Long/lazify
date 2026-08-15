import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import {
  addMonths,
  clampToBounds,
  isDayOutOfBounds,
  isMonthOutOfBounds,
  isYearOutOfBounds,
  monthGrid,
  parseIsoDate,
  toIsoDate,
  yearPage
} from "./calendar-grid";

interface CalendarProps {
  value: string | null;
  onSelect: (iso: string) => void;
  focusTick?: number;
  minDate?: string | null;
  maxDate?: string | null;
}

type Panel = "days" | "months" | "years";

const YEARS_PER_PAGE = 12;

function useCalendarNames(locale: string) {
  return useMemo(() => {
    const months = Array.from({ length: 12 }, (_item, month) =>
      new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, month, 1))
    );

    const shortMonths = Array.from({ length: 12 }, (_item, month) =>
      new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2026, month, 1))
    );

    const weekdays = Array.from({ length: 7 }, (_item, day) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 0, 5 + day))
    );

    return { months, shortMonths, weekdays };
  }, [locale]);
}

function Cell({
  label,
  selected,
  outline,
  dimmed,
  tall,
  disabled,
  onClick
}: Readonly<{
  label: string | number;
  selected?: boolean;
  outline?: boolean;
  dimmed?: boolean;
  tall?: boolean;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center rounded-lg border transition-colors",
        tall ? "h-10" : "h-8",
        selected
          ? "border-accent bg-accent text-bg"
          : "border-transparent enabled:hover:border-accent/40 enabled:hover:bg-text/[0.04]",
        !selected && outline && "border-accent/40",
        !selected && dimmed && "opacity-35",
        disabled && "cursor-not-allowed opacity-30 line-through"
      )}
    >
      <SmallText className={clsx(selected ? "!text-bg font-semibold" : "!text-text")}>
        {label}
      </SmallText>
    </button>
  );
}

const arrowClassName = clsx(
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted",
  "enabled:hover:border-accent/40 enabled:hover:text-accent",
  "disabled:cursor-not-allowed disabled:opacity-30"
);

export function Calendar({
  value,
  onSelect,
  focusTick = 0,
  minDate,
  maxDate
}: Readonly<CalendarProps>) {
  const { i18n } = useTranslation();
  const selected = parseIsoDate(value);
  const today = new Date();

  const bounds = useMemo(() => ({ min: minDate, max: maxDate }), [minDate, maxDate]);

  const [panel, setPanel] = useState<Panel>("days");
  const [view, setView] = useState(() => {
    const from = selected ?? today;
    return clampToBounds(from.getFullYear(), from.getMonth(), { min: minDate, max: maxDate });
  });

  useEffect(() => {
    const date = parseIsoDate(value) ?? new Date();

    setView(clampToBounds(date.getFullYear(), date.getMonth(), bounds));
    setPanel("days");
  }, [value, focusTick, bounds]);

  const { months, shortMonths, weekdays } = useCalendarNames(i18n.language);
  const weeks = useMemo(() => monthGrid(view.year, view.month), [view]);
  const years = useMemo(() => yearPage(view.year, YEARS_PER_PAGE), [view.year]);
  const todayIso = toIsoDate(today);

  const stepTo = (delta: number) => {
    if (panel === "days") return addMonths(view.year, view.month, delta);

    const jump = panel === "years" ? YEARS_PER_PAGE : 1;
    return { year: view.year + delta * jump, month: view.month };
  };

  const step = (delta: number) => setView(stepTo(delta));

  const cannotStep = (delta: number) => {
    const next = stepTo(delta);

    if (panel === "days") return isMonthOutOfBounds(next.year, next.month, bounds);
    if (panel === "months") return isYearOutOfBounds(next.year, bounds);

    return yearPage(next.year, YEARS_PER_PAGE).every((year) => isYearOutOfBounds(year, bounds));
  };

  const nextPanel: Record<Panel, Panel> = { days: "months", months: "years", years: "days" };

  const title =
    panel === "days"
      ? `${months[view.month]} ${view.year}`
      : panel === "months"
        ? String(view.year)
        : `${years[0]} – ${years.at(-1)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={cannotStep(-1)}
          aria-label="−"
          className={arrowClassName}
        >
          <UiIcon name="arrow-left" className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => setPanel(nextPanel[panel])}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5",
            panel === "days"
              ? "border-transparent hover:border-accent/40"
              : "border-accent/40 bg-accent/10"
          )}
        >
          <SmallText
            className={clsx("font-semibold", panel === "days" ? "!text-text" : "!text-accent")}
          >
            {title}
          </SmallText>
          <UiIcon
            name={panel === "days" ? "expand" : "collapse"}
            className={clsx("h-3 w-3", panel === "days" ? "text-muted" : "text-accent")}
          />
        </button>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={cannotStep(1)}
          aria-label="+"
          className={arrowClassName}
        >
          <UiIcon name="arrow-right" className="h-3 w-3" />
        </button>
      </div>

      {panel === "days" ? (
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((name) => (
            <CaptionText key={name} tone="muted" className="py-1 text-center">
              {name}
            </CaptionText>
          ))}

          {weeks.flat().map((day) => (
            <Cell
              key={day.iso}
              label={day.day}
              selected={day.iso === value}
              outline={day.iso === todayIso}
              dimmed={!day.inMonth}
              disabled={isDayOutOfBounds(day.iso, bounds)}
              onClick={() => onSelect(day.iso)}
            />
          ))}
        </div>
      ) : null}

      {panel === "months" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {shortMonths.map((name, month) => (
            <Cell
              key={name}
              label={name}
              tall
              selected={month === view.month}
              outline={month === today.getMonth() && view.year === today.getFullYear()}
              disabled={isMonthOutOfBounds(view.year, month, bounds)}
              onClick={() => {
                setView({ ...view, month });
                setPanel("days");
              }}
            />
          ))}
        </div>
      ) : null}

      {panel === "years" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {years.map((year) => (
            <Cell
              key={year}
              label={year}
              tall
              selected={year === view.year}
              outline={year === today.getFullYear()}
              disabled={isYearOutOfBounds(year, bounds)}
              onClick={() => {
                setView({ ...view, year });
                setPanel("months");
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
