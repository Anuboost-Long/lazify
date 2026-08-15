import { describe, expect, it } from "vitest";

import {
  addMonths,
  clampToBounds,
  isDayOutOfBounds,
  isMonthOutOfBounds,
  isYearOutOfBounds,
  monthGrid,
  parseIsoDate,
  toIsoDate,
  yearPage,
  yearRange
} from "../../src/renderer/shared/ui/date/calendar-grid";

describe("reading and writing a date-only string", () => {
  it("keeps the day it was given, whatever the timezone", () => {
    const parsed = parseIsoDate("2026-09-01");

    // Read as UTC this lands on August 31st anywhere west of Greenwich.
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(1);
  });

  it("survives a round trip", () => {
    expect(toIsoDate(parseIsoDate("2026-02-28") as Date)).toBe("2026-02-28");
  });

  it("pads single digits, so the string always sorts", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("says nothing rather than guessing", () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("not a date")).toBeNull();
  });
});

describe("the month grid", () => {
  it("is always six weeks of seven days, so the modal never jumps", () => {
    for (const month of [0, 1, 5, 11]) {
      const weeks = monthGrid(2026, month);

      expect(weeks).toHaveLength(6);
      expect(weeks.every((week) => week.length === 7)).toBe(true);
    }
  });

  it("starts the week on Monday and leads in with the previous month", () => {
    // 1 September 2026 is a Tuesday.
    const [firstWeek] = monthGrid(2026, 8);

    expect(firstWeek[0].iso).toBe("2026-08-31");
    expect(firstWeek[0].inMonth).toBe(false);
    expect(firstWeek[1].iso).toBe("2026-09-01");
    expect(firstWeek[1].inMonth).toBe(true);
  });

  it("takes a different first day when asked", () => {
    const [firstWeek] = monthGrid(2026, 8, 0);

    expect(firstWeek[0].iso).toBe("2026-08-30");
  });

  it("holds every day of the month exactly once", () => {
    const inMonth = monthGrid(2026, 1)
      .flat()
      .filter((day) => day.inMonth)
      .map((day) => day.iso);

    expect(inMonth).toHaveLength(28);
    expect(new Set(inMonth).size).toBe(28);
    expect(inMonth[0]).toBe("2026-02-01");
    expect(inMonth.at(-1)).toBe("2026-02-28");
  });

  it("counts a leap February", () => {
    const inMonth = monthGrid(2028, 1)
      .flat()
      .filter((day) => day.inMonth);

    expect(inMonth).toHaveLength(29);
  });
});

describe("moving around", () => {
  it("wraps the year at either end", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("offers years either side of the one in view", () => {
    const years = yearRange(2026, 2, 3);

    expect(years).toEqual([2024, 2025, 2026, 2027, 2028, 2029]);
  });

  it("pages years in fixed blocks, so the grid never reshuffles", () => {
    // Every year in a block shows that same block, wherever you came from.
    expect(yearPage(2026)).toEqual(yearPage(2020));
    expect(yearPage(2026)[0]).toBe(2016);
    expect(yearPage(2026)).toHaveLength(12);
    expect(yearPage(2026).at(-1)).toBe(2027);
    // The next block starts where the last one ended.
    expect(yearPage(2028)[0]).toBe(2028);
  });
});

describe("limits", () => {
  const bounds = { min: "2026-08-15", max: "2026-10-10" };

  it("lets everything through when no limit is given", () => {
    expect(isDayOutOfBounds("1999-01-01")).toBe(false);
    expect(isMonthOutOfBounds(2099, 5)).toBe(false);
    expect(isYearOutOfBounds(1970)).toBe(false);
  });

  it("takes one side on its own", () => {
    expect(isDayOutOfBounds("2026-08-14", { min: "2026-08-15" })).toBe(true);
    expect(isDayOutOfBounds("2099-01-01", { min: "2026-08-15" })).toBe(false);
    expect(isDayOutOfBounds("2026-10-11", { max: "2026-10-10" })).toBe(true);
    expect(isDayOutOfBounds("1999-01-01", { max: "2026-10-10" })).toBe(false);
  });

  it("counts the bounds themselves as allowed", () => {
    expect(isDayOutOfBounds("2026-08-15", bounds)).toBe(false);
    expect(isDayOutOfBounds("2026-10-10", bounds)).toBe(false);
  });

  it("blocks the days either side", () => {
    expect(isDayOutOfBounds("2026-08-14", bounds)).toBe(true);
    expect(isDayOutOfBounds("2026-10-11", bounds)).toBe(true);
  });

  it("keeps the month a bound falls inside open", () => {
    // August is half allowed, so August is reachable.
    expect(isMonthOutOfBounds(2026, 7, bounds)).toBe(false);
    expect(isMonthOutOfBounds(2026, 9, bounds)).toBe(false);
  });

  it("blocks the months that are entirely outside", () => {
    expect(isMonthOutOfBounds(2026, 6, bounds)).toBe(true);
    expect(isMonthOutOfBounds(2026, 10, bounds)).toBe(true);
  });

  it("blocks whole years the same way", () => {
    expect(isYearOutOfBounds(2026, bounds)).toBe(false);
    expect(isYearOutOfBounds(2025, bounds)).toBe(true);
    expect(isYearOutOfBounds(2027, bounds)).toBe(true);
  });

  it("does not block a year a bound falls inside, at either end of it", () => {
    expect(isYearOutOfBounds(2026, { min: "2026-12-31" })).toBe(false);
    expect(isYearOutOfBounds(2026, { max: "2026-01-01" })).toBe(false);
  });

  it("pulls a view outside the limits back to the nearest month it can show", () => {
    expect(clampToBounds(2025, 0, bounds)).toEqual({ year: 2026, month: 7 });
    expect(clampToBounds(2027, 11, bounds)).toEqual({ year: 2026, month: 9 });
    expect(clampToBounds(2026, 8, bounds)).toEqual({ year: 2026, month: 8 });
  });

  it("leaves the view alone when there are no limits", () => {
    expect(clampToBounds(1999, 3)).toEqual({ year: 1999, month: 3 });
  });
});
