export interface DateBounds {
  min?: string | null;
  max?: string | null;
}

export function isDayOutOfBounds(iso: string, bounds: DateBounds = {}): boolean {
  if (bounds.min && iso < bounds.min) return true;
  return Boolean(bounds.max && iso > bounds.max);
}

function lastDayOf(year: number, month: number): string {
  return toIsoDate(new Date(year, month + 1, 0));
}

export function isMonthOutOfBounds(year: number, month: number, bounds: DateBounds = {}): boolean {
  if (bounds.min && lastDayOf(year, month) < bounds.min) return true;
  return Boolean(bounds.max && toIsoDate(new Date(year, month, 1)) > bounds.max);
}

export function isYearOutOfBounds(year: number, bounds: DateBounds = {}): boolean {
  if (bounds.min && `${year}-12-31` < bounds.min) return true;
  return Boolean(bounds.max && `${year}-01-01` > bounds.max);
}

export function clampToBounds(
  year: number,
  month: number,
  bounds: DateBounds = {}
): { year: number; month: number } {
  const minDate = parseIsoDate(bounds.min);
  const maxDate = parseIsoDate(bounds.max);

  if (minDate && isMonthOutOfBounds(year, month, { min: bounds.min })) {
    return { year: minDate.getFullYear(), month: minDate.getMonth() };
  }

  if (maxDate && isMonthOutOfBounds(year, month, { max: bounds.max })) {
    return { year: maxDate.getFullYear(), month: maxDate.getMonth() };
  }

  return { year, month };
}

export interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
}

export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const moved = new Date(year, month + delta, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

export function monthGrid(year: number, month: number, weekStart = 1): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;

  const start = new Date(year, month, 1 - lead);
  const weeks: CalendarDay[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + weekday);

      days.push({
        iso: toIsoDate(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month && date.getFullYear() === year
      });
    }

    weeks.push(days);
  }

  return weeks;
}

export function yearRange(around: number, back = 5, forward = 10): number[] {
  return Array.from({ length: back + forward + 1 }, (_item, index) => around - back + index);
}

export function yearPage(around: number, size = 12): number[] {
  const start = Math.floor(around / size) * size;
  return Array.from({ length: size }, (_item, index) => start + index);
}
