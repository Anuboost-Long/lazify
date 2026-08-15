import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatDate, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { DatePickerModal } from "./DatePickerModal";
import { parseIsoDate } from "./calendar-grid";

interface DateFieldProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  title?: string;
  minDate?: string | null;
  maxDate?: string | null;
}

export function DateField({
  value,
  onChange,
  title,
  minDate,
  maxDate
}: Readonly<DateFieldProps>) {
  const { t } = useTranslation();
  const { dateFormat } = useDateTimeFormat();
  const [picking, setPicking] = useState(false);

  const date = parseIsoDate(value);

  return (
    <>
      <button
        type="button"
        onClick={() => setPicking(true)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5",
          "text-left transition-colors hover:border-accent/40"
        )}
      >
        <UiIcon name="journal-page" className="h-3.5 w-3.5 shrink-0 text-muted" />

        <SmallText className={clsx("min-w-0 flex-1 truncate", date ? "!text-text" : "!text-muted")}>
          {date ? formatDate(date, dateFormat) : t(translation.DatePicker.NoDate)}
        </SmallText>

        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={t(translation.GlobalTerm.Clear)}
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onChange(null);
            }}
            className="shrink-0 rounded p-0.5 text-muted hover:text-error"
          >
            <UiIcon name="xmark" className="h-3 w-3" />
          </span>
        ) : null}
      </button>

      <DatePickerModal
        open={picking}
        value={value}
        title={title}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={(iso) => {
          onChange(iso);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </>
  );
}
