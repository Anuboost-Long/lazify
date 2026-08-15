import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { Calendar } from "./Calendar";
import { isDayOutOfBounds, toIsoDate } from "./calendar-grid";

interface DatePickerModalProps {
  open: boolean;
  value: string | null;
  onSelect: (iso: string | null) => void;
  onClose: () => void;
  title?: string;
  minDate?: string | null;
  maxDate?: string | null;
}

export function DatePickerModal({
  open,
  value,
  onSelect,
  onClose,
  title,
  minDate,
  maxDate
}: Readonly<DatePickerModalProps>) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState(value);
  const [focusTick, setFocusTick] = useState(0);

  const goTo = (iso: string) => {
    setPicked(iso);
    setFocusTick((tick) => tick + 1);
  };

  useEffect(() => {
    if (!open) return;

    setPicked(value);
    setFocusTick((tick) => tick + 1);
  }, [open, value]);

  return (
    <BaseModal open={open} onClose={onClose}>
      <div className="w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <SectionTitle>{title ?? t(translation.DatePicker.SelectDate)}</SectionTitle>

          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
          >
            <UiIcon name="xmark" className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="px-5 py-4">
          <Calendar
            value={picked}
            onSelect={goTo}
            focusTick={focusTick}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => goTo(toIsoDate(new Date()))}
            disabled={isDayOutOfBounds(toIsoDate(new Date()), { min: minDate, max: maxDate })}
            className={clsx(
              "rounded-full border border-border px-3 py-1.5 text-[12px] text-muted",
              "enabled:hover:border-accent/40 enabled:hover:text-accent",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            {t(translation.GlobalTerm.Today)}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="rounded-full px-3 py-1.5 text-[12px] text-muted hover:text-error"
            >
              {t(translation.GlobalTerm.Clear)}
            </button>

            <button
              type="button"
              onClick={() => onSelect(picked)}
              disabled={!picked}
              className={clsx(
                "rounded-full border border-transparent bg-accent px-5 py-1.5",
                "text-[12px] font-semibold text-bg transition-colors duration-150",
                "hover:bg-accentHover disabled:cursor-not-allowed disabled:bg-accent/60"
              )}
            >
              {t(translation.GlobalTerm.Confirm)}
            </button>
          </div>
        </footer>
      </div>
    </BaseModal>
  );
}
