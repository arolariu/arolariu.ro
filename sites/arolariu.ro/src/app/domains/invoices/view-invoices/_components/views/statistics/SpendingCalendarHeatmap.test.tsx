/**
 * @fileoverview Unit tests for the SpendingCalendarHeatmap yearly calendar.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/SpendingCalendarHeatmap.test
 *
 * @remarks
 * Only `Date` is faked (pinned to 15 June 2026) so the "current year" and the month layouts are deterministic,
 * while the Base UI tooltip timers and user-event keep using real timers.
 */

import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {DailySpending} from "../../../_utils/statistics";
import SpendingCalendarHeatmap from "./SpendingCalendarHeatmap";

const HEATMAP_KEY = "cards.invoices.statistics.calendarHeatmap";
const PREVIOUS_YEAR = `${HEATMAP_KEY}.navigation.previous`;
const NEXT_YEAR = `${HEATMAP_KEY}.navigation.next`;
const LEVEL_CLASSES = ["levelEmpty", "level1", "level2", "level3", "level4"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type LevelClass = (typeof LEVEL_CLASSES)[number];

const spending: DailySpending[] = [
  {date: "2026-03-10", amount: 100, invoiceCount: 2},
  {date: "2026-03-11", amount: 60, invoiceCount: 1},
  {date: "2026-03-12", amount: 40, invoiceCount: 1},
  {date: "2026-03-13", amount: 20, invoiceCount: 1},
  {date: "2026-03-14", amount: 0, invoiceCount: 0},
  {date: "2025-07-04", amount: 100, invoiceCount: 3},
];

/** Matches a CSS-module class name as a whole token so the assertion holds for any naming strategy. */
function hasClassToken(element: Element, name: string): boolean {
  return new RegExp(`(^|[\\s_])${name}([\\s_]|$)`, "u").test(element.className);
}

function expectLevel(element: Element, expected: LevelClass): void {
  expect(hasClassToken(element, expected)).toBe(true);
  for (const other of LEVEL_CLASSES.filter((name) => name !== expected)) {
    expect(hasClassToken(element, other)).toBe(false);
  }
}

function getMonthGrid(month: (typeof MONTHS)[number]): HTMLElement {
  return screen.getByRole("grid", {name: month});
}

function getDayCell(month: (typeof MONTHS)[number], day: number): HTMLElement {
  const cell = within(getMonthGrid(month))
    .getAllByRole("gridcell")
    .find((candidate) => candidate.textContent === String(day));
  if (cell === undefined) {
    throw new Error(`No day cell rendered for ${month} ${day}`);
  }
  return cell;
}

/** Returns the Mon→Sun week rows of a month grid (skipping the weekday header row). */
function getWeekRows(month: (typeof MONTHS)[number]): HTMLElement[] {
  return within(getMonthGrid(month)).getAllByRole("row").slice(1);
}

function renderHeatmap(data: DailySpending[] = spending, currency = "RON") {
  return render(
    <SpendingCalendarHeatmap
      data={data}
      currency={currency}
    />,
  );
}

describe("SpendingCalendarHeatmap", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("layout", () => {
    it("renders the title, description, current year, and twelve month calendars in order", () => {
      renderHeatmap();

      expect(screen.getByText(`${HEATMAP_KEY}.title`)).toBeInTheDocument();
      expect(screen.getByText(`${HEATMAP_KEY}.description`)).toBeInTheDocument();
      expect(screen.getByText("2026")).toBeInTheDocument();
      expect(screen.getAllByRole("grid").map((grid) => grid.getAttribute("aria-label"))).toEqual([...MONTHS]);
      expect(screen.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent)).toEqual([...MONTHS]);
    });

    it("renders seven weekday column headers per month", () => {
      renderHeatmap();

      const headers = within(getMonthGrid("January")).getAllByRole("columnheader");
      expect(headers).toHaveLength(7);
      expect(screen.getAllByRole("columnheader")).toHaveLength(7 * MONTHS.length);
    });

    it("renders one numbered day cell per calendar day", () => {
      renderHeatmap();

      expect(within(getMonthGrid("January")).getAllByRole("gridcell")).toHaveLength(31);
      expect(within(getMonthGrid("February")).getAllByRole("gridcell")).toHaveLength(28);
      expect(within(getMonthGrid("June")).getAllByRole("gridcell")).toHaveLength(30);
    });

    it("pads the first and last weeks so every week row spans Monday to Sunday", () => {
      renderHeatmap();

      const januaryWeeks = getWeekRows("January");
      expect(januaryWeeks).toHaveLength(5);
      for (const week of januaryWeeks) {
        expect(week.children).toHaveLength(7);
      }
      // 1 January 2026 is a Thursday and 31 January 2026 is a Saturday.
      expect(
        within(januaryWeeks[0]!)
          .getAllByRole("gridcell")
          .map((cell) => cell.textContent),
      ).toEqual(["1", "2", "3", "4"]);
      expect(
        within(januaryWeeks.at(-1)!)
          .getAllByRole("gridcell")
          .map((cell) => cell.textContent),
      ).toEqual(["26", "27", "28", "29", "30", "31"]);
    });

    it("adds no padding to a month that starts on Monday or ends on Sunday", () => {
      renderHeatmap();

      // 1 June 2026 is a Monday; 31 May 2026 is a Sunday.
      const juneWeeks = getWeekRows("June");
      expect(within(juneWeeks[0]!).getAllByRole("gridcell")).toHaveLength(7);
      expect(within(juneWeeks[0]!).getAllByRole("gridcell")[0]).toHaveTextContent("1");
      const mayWeeks = getWeekRows("May");
      expect(within(mayWeeks.at(-1)!).getAllByRole("gridcell")).toHaveLength(7);
      expect(within(mayWeeks.at(-1)!).getAllByRole("gridcell").at(-1)).toHaveTextContent("31");
    });

    it("renders the five-step legend from less to more", () => {
      renderHeatmap();

      expect(screen.getByText(`${HEATMAP_KEY}.legend.less`)).toBeInTheDocument();
      expect(screen.getByText(`${HEATMAP_KEY}.legend.more`)).toBeInTheDocument();
      LEVEL_CLASSES.forEach((levelClass, level) => {
        expectLevel(screen.getByLabelText(`Level ${level}`), levelClass);
      });
    });
  });

  describe("spending intensity", () => {
    it("shades each day by its share of the maximum daily spend", () => {
      renderHeatmap();

      expectLevel(getDayCell("March", 10), "level4");
      expectLevel(getDayCell("March", 11), "level3");
      expectLevel(getDayCell("March", 12), "level2");
      expectLevel(getDayCell("March", 13), "level1");
      expectLevel(getDayCell("March", 14), "levelEmpty");
      expectLevel(getDayCell("March", 15), "levelEmpty");
    });

    it("labels each day cell with its date, amount, and currency", () => {
      renderHeatmap(spending, "EUR");

      expect(getDayCell("March", 10)).toHaveAccessibleName(/2026: 100\.00 EUR$/u);
      expect(getDayCell("March", 15)).toHaveAccessibleName(/2026: 0\.00 EUR$/u);
    });

    it("keeps the empty shade when the only recorded amount is a refund", () => {
      renderHeatmap([{date: "2026-03-10", amount: -5, invoiceCount: 1}]);

      const refundDay = getDayCell("March", 10);
      expect(refundDay).toHaveAccessibleName(/2026: -5\.00 RON$/u);
      expectLevel(refundDay, "levelEmpty");
    });

    it("renders every day with the empty shade when there is no spending data", () => {
      renderHeatmap([]);

      expectLevel(getDayCell("March", 10), "levelEmpty");
      expectLevel(getDayCell("December", 31), "levelEmpty");
    });
  });

  describe("year navigation", () => {
    it("disables moving past the current year", () => {
      renderHeatmap();

      expect(screen.getByRole("button", {name: NEXT_YEAR})).toBeDisabled();
      expect(screen.getByRole("button", {name: PREVIOUS_YEAR})).toBeEnabled();
    });

    it("moves to the previous year with its own data and back to the current year", async () => {
      const user = userEvent.setup();
      renderHeatmap();

      await user.click(screen.getByRole("button", {name: PREVIOUS_YEAR}));

      expect(screen.getByText("2025")).toBeInTheDocument();
      expect(screen.queryByText("2026")).not.toBeInTheDocument();
      expect(screen.getByRole("button", {name: NEXT_YEAR})).toBeEnabled();
      expectLevel(getDayCell("July", 4), "level4");
      expect(getDayCell("July", 4)).toHaveAccessibleName(/2025: 100\.00 RON$/u);
      expectLevel(getDayCell("March", 10), "levelEmpty");

      await user.click(screen.getByRole("button", {name: NEXT_YEAR}));

      expect(screen.getByText("2026")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: NEXT_YEAR})).toBeDisabled();
      expectLevel(getDayCell("March", 10), "level4");
      expectLevel(getDayCell("July", 4), "levelEmpty");
    });

    it("keeps moving back one year per click", async () => {
      const user = userEvent.setup();
      renderHeatmap();
      const previous = screen.getByRole("button", {name: PREVIOUS_YEAR});

      await user.click(previous);
      await user.click(previous);

      expect(screen.getByText("2024")).toBeInTheDocument();
      // 1 January 2024 is a Monday, so the first January week has no leading padding.
      expect(within(getWeekRows("January")[0]!).getAllByRole("gridcell")).toHaveLength(7);
    });
  });

  describe("day tooltip", () => {
    it("shows the amount and invoice count when hovering a day with spending", async () => {
      const user = userEvent.setup();
      renderHeatmap();

      await user.hover(getDayCell("March", 10));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent("2026");
      expect(within(tooltip).getByText(`${HEATMAP_KEY}.tooltip.amount: 100.00 RON`)).toBeInTheDocument();
      expect(within(tooltip).getByText(`${HEATMAP_KEY}.tooltip.invoices`)).toBeInTheDocument();
      expect(within(tooltip).queryByText(`${HEATMAP_KEY}.tooltip.noSpending`)).not.toBeInTheDocument();
    });

    it("shows the no-spending message when hovering a day without spending", async () => {
      const user = userEvent.setup();
      renderHeatmap();

      await user.hover(getDayCell("March", 14));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent("2026");
      expect(within(tooltip).getByText(`${HEATMAP_KEY}.tooltip.noSpending`)).toBeInTheDocument();
      expect(within(tooltip).queryByText(/tooltip\.amount/u)).not.toBeInTheDocument();
      expect(within(tooltip).queryByText(`${HEATMAP_KEY}.tooltip.invoices`)).not.toBeInTheDocument();
    });
  });
});
