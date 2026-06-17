import { atom, useAtom } from "jotai";
import {
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  type DateFormatId,
  type TimeFormatId,
} from "@renderer/features/settings/components/settings-config";

export function formatDate(date: Date, formatId: DateFormatId): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();

  switch (formatId) {
    case "MM/DD/YYYY": return `${m}/${d}/${y}`;
    case "DD/MM/YYYY": return `${d}/${m}/${y}`;
    case "YYYY-MM-DD": return `${y}-${m}-${d}`;
  }
}

export function formatTime(date: Date, formatId: TimeFormatId): string {
  const h24 = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");

  if (formatId === "24h") {
    return `${String(h24).padStart(2, "0")}:${min}`;
  }

  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${h12}:${min} ${ampm}`;
}

const DATE_FORMAT_STORAGE_KEY = "lazify-date-format";
const TIME_FORMAT_STORAGE_KEY = "lazify-time-format";

function readStoredDateFormat(): DateFormatId {
  if (typeof window === "undefined") return DATE_FORMAT_OPTIONS[0].id;
  const stored = globalThis.localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
  return DATE_FORMAT_OPTIONS.some((o) => o.id === stored)
    ? (stored as DateFormatId)
    : DATE_FORMAT_OPTIONS[0].id;
}

function readStoredTimeFormat(): TimeFormatId {
  if (typeof window === "undefined") return TIME_FORMAT_OPTIONS[0].id;
  const stored = globalThis.localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
  return TIME_FORMAT_OPTIONS.some((o) => o.id === stored)
    ? (stored as TimeFormatId)
    : TIME_FORMAT_OPTIONS[0].id;
}

const dateFormatAtom = atom<DateFormatId>(readStoredDateFormat());
const timeFormatAtom = atom<TimeFormatId>(readStoredTimeFormat());

export function useDateTimeFormat() {
  const [dateFormat, setDateFormatAtom] = useAtom(dateFormatAtom);
  const [timeFormat, setTimeFormatAtom] = useAtom(timeFormatAtom);

  function setDateFormat(value: DateFormatId) {
    globalThis.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, value);
    setDateFormatAtom(value);
  }

  function setTimeFormat(value: TimeFormatId) {
    globalThis.localStorage.setItem(TIME_FORMAT_STORAGE_KEY, value);
    setTimeFormatAtom(value);
  }

  return { dateFormat, setDateFormat, timeFormat, setTimeFormat };
}
