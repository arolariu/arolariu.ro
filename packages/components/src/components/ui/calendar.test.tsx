import "@testing-library/jest-dom/vitest";
import {act, fireEvent, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {fr} from "date-fns/locale";
import {createRef, StrictMode, useState} from "react";
import {CalendarDay, type RootProps} from "react-day-picker";
import {composeStories} from "storybook-react-rsbuild";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Features, transform} from "lightningcss";
import postcss from "postcss";

import {Calendar, CalendarDayButton, type CalendarDayButtonProps, type DateRange} from "./calendar";
import styles from "./calendar.module.css";
import * as stories from "./calendar.stories";

function emittedCalendarStyles(): string {
  const output = transform({
    filename: "calendar.module.css",
    code: Buffer.from(readFileSync(join(import.meta.dirname, "calendar.module.css"), "utf8")),
    cssModules: true,
    include: Features.Nesting,
  });
  let css = output.code.toString();
  if (!output.exports) throw new Error("Expected compiled CSS Module exports");
  for (const [local, exported] of Object.entries(output.exports).sort(([, left], [, right]) => right.name.length - left.name.length)) {
    if (styles[local]) css = css.replaceAll(`.${exported.name}`, `.${styles[local]}`);
  }
  return css;
}

function calendarDeclarations(css: string, element: Element): Record<string, string> {
  const declarations: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === "atrule") return;
    if (!rule.selectors.some((selector) => element.matches(selector))) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

function dayButton(isoDate: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`[role="gridcell"][data-day="${isoDate}"] button`);
  if (!button) throw new Error(`Expected an interactive calendar day for ${isoDate}.`);
  return button;
}

function hasTokenListAdd(value: unknown): value is Pick<DOMTokenList, "add"> {
  return typeof value === "object" && value !== null && "add" in value && typeof value.add === "function";
}

function CustomRoot({rootRef, ...props}: Readonly<RootProps>): React.JSX.Element {
  return (
    <div
      ref={rootRef}
      data-custom-root='true'
      {...props}
    />
  );
}

function EventDayButton(props: Readonly<CalendarDayButtonProps>): React.JSX.Element {
  return (
    <CalendarDayButton
      data-event={props.modifiers["event"] || undefined}
      {...props}>
      <span>{props.children}</span>
      {props.modifiers["event"] && <span>Event</span>}
    </CalendarDayButton>
  );
}

function SingleSelection(): React.JSX.Element {
  const [selected, setSelected] = useState<Date | undefined>();
  return (
    <Calendar
      mode='single'
      defaultMonth={new Date(2024, 0, 1)}
      selected={selected}
      onSelect={setSelected}
      disabled={new Date(2024, 0, 16)}
    />
  );
}

function RangeSelection(): React.JSX.Element {
  const [selected, setSelected] = useState<DateRange | undefined>();
  return (
    <Calendar
      mode='range'
      defaultMonth={new Date(2024, 0, 1)}
      selected={selected}
      onSelect={setSelected}
    />
  );
}

function MultipleSelection(): React.JSX.Element {
  const [selected, setSelected] = useState<Date[] | undefined>();
  return (
    <Calendar
      mode='multiple'
      defaultMonth={new Date(2024, 0, 1)}
      selected={selected}
      onSelect={setSelected}
    />
  );
}

describe("Calendar", () => {
  it.each(
    (["around", "after"] as const).flatMap((navLayout) =>
      (["ltr", "rtl"] as const).flatMap((dir) => [1, 2].map((numberOfMonths) => ({navLayout, dir, numberOfMonths}))),
    ),
  )("lays out real $navLayout navigation with $numberOfMonths month(s) in $dir", async ({navLayout, dir, numberOfMonths}) => {
    const user = userEvent.setup();
    const sheet = document.createElement("style");
    const css = emittedCalendarStyles();
    sheet.textContent = css;
    document.head.append(sheet);
    try {
      const {container} = render(
        <Calendar
          defaultMonth={new Date(2024, 0, 1)}
          navLayout={navLayout}
          dir={dir}
          numberOfMonths={numberOfMonths}
        />,
      );
      const root = container.firstElementChild;
      expect(root).toHaveAttribute("data-nav-layout", navLayout);
      expect(root).toHaveAttribute("dir", dir);
      const months = Array.from(container.querySelectorAll<HTMLElement>(".rdp-month"));
      expect(months).toHaveLength(numberOfMonths);
      const previous = screen.getByRole("button", {name: "Go to the Previous Month"});
      const next = screen.getByRole("button", {name: "Go to the Next Month"});
      for (const month of months) {
        expect(getComputedStyle(month).display).toBe("grid");
        expect(calendarDeclarations(css, month)["grid-template-columns"]).toBe(
          navLayout === "around" ? "var(--ac-cell-size) minmax(0, 1fr) var(--ac-cell-size)" : "minmax(0, 1fr) auto",
        );
        const caption = month.querySelector<HTMLElement>(".rdp-month_caption");
        if (!caption) throw new Error("Missing real month caption");
        expect(calendarDeclarations(css, caption)["grid-row"]).toBe("1");
        expect(calendarDeclarations(css, caption)["grid-column"]).toBe(navLayout === "around" ? "2" : "1");
        const grid = within(month).getByRole("grid");
        // Lightning CSS combines row/column into grid-area. Happy DOM does not
        // expand that shorthand: verify its emitted, matching rule directly.
        expect(calendarDeclarations(css, grid)["grid-area"]).toBe("2 / 1 / auto / -1");
      }
      if (navLayout === "around") {
        expect(container.querySelector(".rdp-nav")).toBeNull();
        expect(previous.parentElement).toBe(months[0]);
        expect(next.parentElement).toBe(months.at(-1));
        expect(previous.nextElementSibling).toHaveClass("rdp-month_caption");
        expect(next.previousElementSibling).toHaveClass("rdp-month_caption");
        expect(calendarDeclarations(css, previous)["grid-area"]).toBe("1 / 1");
        expect(calendarDeclarations(css, next)["grid-area"]).toBe("1 / 3");
      } else {
        const nav = screen.getByRole("navigation");
        expect(nav.parentElement).toBe(months.at(-1));
        expect(nav.previousElementSibling).toHaveClass("rdp-month_caption");
        expect(nav.nextElementSibling).toBe(screen.getAllByRole("grid").at(-1));
        expect(getComputedStyle(nav).position).toBe("static");
        expect(calendarDeclarations(css, nav)["grid-area"]).toBe("1 / 2");
        expect(getComputedStyle(nav).width).toBe("auto");
        expect(previous.parentElement).toBe(nav);
        expect(next.parentElement).toBe(nav);
      }
      await user.click(next);
      expect(screen.getAllByRole("grid")[0]).toHaveAccessibleName("February 2024");
      if (numberOfMonths === 2) expect(screen.getAllByRole("grid")[1]).toHaveAccessibleName("March 2024");
    } finally {
      sheet.remove();
    }
  });

  it.each(["around", "after"] as const)(
    "keeps the $navLayout dropdown and navigation keyboard order aligned with its DOM",
    async (navLayout) => {
      const user = userEvent.setup();
      render(
        <Calendar
          captionLayout='dropdown'
          navLayout={navLayout}
          defaultMonth={new Date(2024, 0, 1)}
        />,
      );
      const previous = screen.getByRole("button", {name: "Go to the Previous Month"});
      const next = screen.getByRole("button", {name: "Go to the Next Month"});
      const month = screen.getByRole("combobox", {name: "Choose the Month"});
      const year = screen.getByRole("combobox", {name: "Choose the Year"});
      const order = navLayout === "around" ? [previous, month, year, next] : [month, year, previous, next];
      for (const control of order) {
        await user.tab();
        expect(control).toHaveFocus();
      }
      await user.keyboard("{Enter}");
      expect(screen.getByRole("grid")).toHaveAccessibleName("February 2024");
    },
  );

  beforeEach(() => {
    // happy-dom accepts whitespace that native DOMTokenList rejects.
    const tokenList = document.createElement("div").classList;
    const prototype: unknown = Object.getPrototypeOf(tokenList);
    if (!hasTokenListAdd(prototype)) throw new Error("The DOM fixture requires a real classList.add method.");
    const add = prototype.add;
    vi.spyOn(prototype, "add").mockImplementation(function (this: DOMTokenList, ...tokens: string[]): void {
      if (tokens.some((token) => /[\t\n\f\r ]/.test(token))) {
        throw new DOMException("A class token cannot contain ASCII whitespace.", "InvalidCharacterError");
      }
      add.apply(this, tokens);
    });
  });

  it("preserves canonical hooks when adding consumer classes", () => {
    const {container} = render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        className='consumer-calendar'
        classNames={{root: "consumer-root", month_grid: "consumer-grid", day_button: "consumer-button", day: "consumer-day"}}
      />,
    );

    expect(container.firstElementChild).toHaveClass("rdp-root", "consumer-root", "consumer-calendar");
    expect(screen.getByRole("grid")).toHaveClass("rdp-month_grid", "consumer-grid");
    expect(dayButton("2024-01-15")).toHaveClass("rdp-day_button", "consumer-button");
    expect(dayButton("2024-01-15").closest("td")).toHaveClass("rdp-day", "consumer-day");
    expect(dayButton("2024-01-15")).toHaveAttribute("data-slot", "calendar-day-button");
  });

  it("passes a merged animation/public ref through a custom Root", () => {
    const ref = createRef<HTMLDivElement>();
    const {container, unmount} = render(
      <Calendar
        animate
        ref={ref}
        defaultMonth={new Date(2024, 0, 1)}
        components={{Root: CustomRoot}}
      />,
    );

    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveAttribute("data-custom-root", "true");
    fireEvent.click(screen.getByRole("button", {name: "Go to the Next Month"}));
    expect(ref.current).toHaveStyle({isolation: "isolate"});
    unmount();
    expect(ref.current).toBeNull();
  });

  it("keeps the root node stable across rerenders and synchronizes a replaced consumer ref", () => {
    const firstRef = createRef<HTMLDivElement>();
    const secondRef = createRef<HTMLDivElement>();
    const {rerender, unmount} = render(
      <Calendar
        animate
        ref={firstRef}
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );
    const root = firstRef.current;

    rerender(
      <Calendar
        animate
        ref={secondRef}
        defaultMonth={new Date(2024, 0, 1)}
        className='updated'
      />,
    );

    expect(firstRef.current).toBeNull();
    expect(secondRef.current).toBe(root);
    expect(secondRef.current).toHaveClass("updated");
    unmount();
    expect(secondRef.current).toBeNull();
  });

  it("runs a React 19 callback ref cleanup when the animated calendar unmounts", () => {
    let attached: HTMLDivElement | null = null;
    let cleaned = 0;
    const {container, unmount} = render(
      <Calendar
        animate
        defaultMonth={new Date(2024, 0, 1)}
        ref={(node) => {
          attached = node;
          return () => {
            attached = null;
            cleaned += 1;
          };
        }}
      />,
    );
    expect(attached).toBe(container.firstElementChild);
    unmount();
    expect(attached).toBeNull();
    expect(cleaned).toBe(1);
  });

  it("uses the calendar locale for day metadata and accessible labels", () => {
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        locale={fr}
        today={new Date(2024, 0, 15)}
      />,
    );

    expect(dayButton("2024-01-15")).toHaveAttribute("data-day", "15/01/2024");
    expect(dayButton("2024-01-15")).toHaveAccessibleName(/lundi 15 janvier 2024/i);
    expect(dayButton("2024-01-15")).toHaveAttribute("data-today", "true");
  });

  it("supports controlled single selection and cannot select disabled dates", async () => {
    const user = userEvent.setup();
    render(<SingleSelection />);

    await user.click(dayButton("2024-01-15"));
    expect(dayButton("2024-01-15")).toHaveAttribute("data-selected-single", "true");
    expect(dayButton("2024-01-15").closest("td")).toHaveAttribute("aria-selected", "true");
    expect(dayButton("2024-01-16")).toBeDisabled();

    await user.click(dayButton("2024-01-16"));
    expect(dayButton("2024-01-16").closest("td")).not.toHaveAttribute("aria-selected");
    expect(dayButton("2024-01-15")).toHaveAttribute("data-selected-single", "true");

    await user.click(dayButton("2024-01-15"));
    expect(dayButton("2024-01-15")).toHaveAttribute("data-selected-single", "false");
  });

  it("preserves range endpoint/middle state and toggles multiple selection", async () => {
    const user = userEvent.setup();
    const {unmount} = render(<RangeSelection />);

    await user.click(dayButton("2024-01-10"));
    await user.click(dayButton("2024-01-12"));
    expect(dayButton("2024-01-10")).toHaveAttribute("data-range-start", "true");
    expect(dayButton("2024-01-11")).toHaveAttribute("data-range-middle", "true");
    expect(dayButton("2024-01-12")).toHaveAttribute("data-range-end", "true");
    expect(dayButton("2024-01-10")).toHaveAttribute("data-selected-single", "false");
    unmount();

    render(<MultipleSelection />);
    await user.click(dayButton("2024-01-10"));
    await user.click(dayButton("2024-01-12"));
    expect(dayButton("2024-01-10")).toHaveAttribute("data-selected-single", "true");
    expect(dayButton("2024-01-12")).toHaveAttribute("data-selected-single", "true");
    await user.click(dayButton("2024-01-10"));
    expect(dayButton("2024-01-10")).toHaveAttribute("data-selected-single", "false");
    expect(dayButton("2024-01-12")).toHaveAttribute("data-selected-single", "true");
  });

  it.each([
    {dir: "ltr", key: "{ArrowRight}", date: "2024-01-16", icon: "lucide-chevron-left"},
    {dir: "rtl", key: "{ArrowRight}", date: "2024-01-14", icon: "lucide-chevron-right"},
  ])("preserves $dir keyboard dates and navigation orientation", async ({dir, key, date, icon}) => {
    const user = userEvent.setup();
    render(
      <Calendar
        mode='single'
        dir={dir}
        defaultMonth={new Date(2024, 0, 1)}
        selected={new Date(2024, 0, 15)}
        autoFocus
      />,
    );

    expect(dayButton("2024-01-15")).toHaveFocus();
    await user.keyboard(key);
    expect(dayButton(date)).toHaveFocus();
    expect(dayButton(date)).toHaveAttribute("data-focused", "true");
    expect(screen.getByRole("button", {name: "Go to the Previous Month"}).querySelector("svg")).toHaveClass(icon);
    await user.click(screen.getByRole("button", {name: "Go to the Next Month"}));
    expect(screen.getByRole("grid")).toHaveAccessibleName("February 2024");
  });

  it.each<{readonly navLayout: "around" | "after"}>([{navLayout: "around"}, {navLayout: "after"}])(
    "does not double-flip RTL chevrons for the $navLayout navigation layout",
    ({navLayout}) => {
      render(
        <Calendar
          mode='single'
          dir='rtl'
          navLayout={navLayout}
          defaultMonth={new Date(2024, 0, 1)}
        />,
      );
      expect(screen.getByRole("button", {name: "Go to the Previous Month"}).querySelector("svg")).toHaveClass("lucide-chevron-right");
      expect(screen.getByRole("button", {name: "Go to the Next Month"}).querySelector("svg")).toHaveClass("lucide-chevron-left");
    },
  );

  it("keeps dropdown navigation and consumer formatter precedence", async () => {
    const user = userEvent.setup();
    render(
      <Calendar
        mode='single'
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
        startMonth={new Date(2023, 0, 1)}
        endMonth={new Date(2025, 11, 1)}
        formatters={{formatMonthDropdown: (date) => `Month ${date.getMonth() + 1}`}}
      />,
    );

    expect(screen.getByRole("option", {name: "Month 1"})).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", {name: "Choose the Month"}), "1");
    await user.selectOptions(screen.getByRole("combobox", {name: "Choose the Year"}), "2025");
    expect(screen.getByRole("grid")).toHaveAccessibleName("February 2025");
  });

  it("retains week number semantics without leaking primitive-only props", () => {
    const {container} = render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        showWeekNumber
        ISOWeek
      />,
    );
    const week = screen.getByRole("rowheader", {name: "Week 1"});

    expect(week.tagName).toBe("TD");
    expect(week).toHaveAttribute("scope", "row");
    expect(week).toHaveTextContent("1");
    expect(container.querySelector("td[week]")).toBeNull();
  });

  it("shows outside-day metadata by default and removes their content when hidden", () => {
    const {rerender} = render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );
    expect(dayButton("2023-12-31")).toHaveAttribute("data-outside", "true");

    rerender(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        showOutsideDays={false}
      />,
    );
    expect(document.querySelector('[data-day="2023-12-31"] button')).toBeNull();
  });

  it("composes a custom DayButton with real selection, locale, modifiers and children", async () => {
    const user = userEvent.setup();
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        locale={fr}
        modifiers={{event: new Date(2024, 0, 15)}}
        components={{DayButton: EventDayButton}}
      />,
    );
    const eventDay = dayButton("2024-01-15");

    expect(eventDay).toHaveAttribute("data-event", "true");
    expect(eventDay).toHaveAttribute("data-day", "15/01/2024");
    expect(within(eventDay).getByText("Event")).toBeInTheDocument();
    expect(within(eventDay).getByText("15")).toBeInTheDocument();
    await user.click(eventDay);
    expect(dayButton("2024-01-15")).toHaveAttribute("data-selected-single", "true");
  });

  it("review correction: names custom day content through DayPicker's labelDayButton, not through button children", () => {
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        modifiers={{event: new Date(2024, 0, 15)}}
        components={{DayButton: EventDayButton}}
        labels={{
          labelDayButton: (date, modifiers, _options, dateLib) =>
            `${dateLib?.format(date, "PPPP") ?? date.toDateString()}${modifiers["event"] ? ", 2 events" : ""}`,
        }}
      />,
    );
    const eventDay = dayButton("2024-01-15");

    // The visible "Event" child is presentational inside the button; only the DayPicker label names the day.
    expect(within(eventDay).getByText("Event")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Monday, January 15th, 2024, 2 events"})).toBe(eventDay);
    expect(dayButton("2024-01-16")).toHaveAccessibleName("Tuesday, January 16th, 2024");
  });

  it("review correction: the events story names event days through DayPicker labels and hides its decorative dots", async () => {
    const user = userEvent.setup();
    const {WithEvents} = composeStories(stories);
    render(<WithEvents />);

    for (const day of ["Friday, January 5th, 2024", "Friday, January 12th, 2024", "Saturday, January 20th, 2024"]) {
      const button = screen.getByRole("button", {name: `${day}, event scheduled`});
      const dot = button.querySelector(".ac-story-calendar-eventDot");
      expect(dot).toHaveAttribute("aria-hidden", "true");
      expect(dot).not.toHaveAttribute("aria-label");
    }
    expect(screen.getByRole("button", {name: "Saturday, January 6th, 2024"})).toBe(dayButton("2024-01-06"));

    await user.click(screen.getByRole("button", {name: "Friday, January 12th, 2024, event scheduled"}));
    expect(screen.getByRole("button", {name: "Friday, January 12th, 2024, event scheduled, selected"})).toBe(dayButton("2024-01-12"));
  });

  it("accepts the exported ref-forwarding CalendarDayButton as a direct component override", () => {
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        locale={fr}
        components={{DayButton: CalendarDayButton}}
      />,
    );
    expect(dayButton("2024-01-15")).toHaveAttribute("data-day", "15/01/2024");
    expect(dayButton("2024-01-15")).toHaveAttribute("data-slot", "calendar-day-button");
  });

  it("attaches the public animated root ref alongside DayPicker's animation ref and clears it on unmount", () => {
    const consumerRef = createRef<HTMLDivElement>();
    const {container, unmount} = render(
      <Calendar
        animate
        ref={consumerRef}
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    expect(consumerRef.current).toBe(container.firstElementChild);
    expect(consumerRef.current).toHaveAttribute("data-slot", "calendar");

    fireEvent.click(screen.getByRole("button", {name: "Go to the Next Month"}));

    expect(consumerRef.current).toBe(container.firstElementChild);
    expect(consumerRef.current).toHaveStyle({isolation: "isolate"});
    const oldCaption = container.querySelector('[aria-hidden="true"] [data-animated-caption]');
    expect(oldCaption).toBeInTheDocument();
    if (!oldCaption) throw new Error("The real DayPicker must expose an outgoing animated caption.");
    expect(oldCaption).toHaveClass("rdp-caption_before_exit");
    fireEvent.animationEnd(oldCaption);
    expect(consumerRef.current).not.toHaveStyle({isolation: "isolate"});
    expect(container.querySelector('[data-animated-month][aria-hidden="true"]')).not.toBeInTheDocument();

    unmount();
    expect(consumerRef.current).toBeNull();
  });

  it("uses a consumer animation override as a single DOM token rather than an appended class list", () => {
    const {container} = render(
      <Calendar
        animate
        defaultMonth={new Date(2024, 0, 1)}
        classNames={{caption_before_exit: "consumer-outgoing-animation"}}
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Go to the Next Month"}));
    const caption = container.querySelector('[data-animated-month][aria-hidden="true"] [data-animated-caption]');
    if (!caption) throw new Error("Expected the real outgoing animated caption.");
    expect(caption).toHaveClass("consumer-outgoing-animation");
    expect(caption).not.toHaveClass("rdp-caption_before_exit");
    fireEvent.animationEnd(caption);
    expect(container.querySelector('[data-animated-month][aria-hidden="true"]')).toBeNull();
  });

  describe("CalendarDayButton", () => {
    const day = new CalendarDay(new Date(2024, 0, 15), new Date(2024, 0, 1));

    it("exports a real ref-forwarding day component with locale and content", () => {
      expect(CalendarDayButton).toBeDefined();
      const ref = createRef<HTMLButtonElement>();
      const {unmount} = render(
        <CalendarDayButton
          ref={ref}
          day={day}
          modifiers={{selected: true}}
          locale={fr}
          className='custom-day-button'
          aria-label='Standalone January 15'
          type='button'>
          15
        </CalendarDayButton>,
      );

      expect(ref.current).toBe(screen.getByRole("button", {name: "Standalone January 15"}));
      expect(ref.current).toHaveAttribute("data-day", "15/01/2024");
      expect(ref.current).toHaveAttribute("data-selected-single", "true");
      expect(ref.current).toHaveClass("rdp-day_button", "custom-day-button");
      expect(ref.current).toHaveTextContent("15");
      unmount();
      expect(ref.current).toBeNull();
    });

    it("focuses only on focused modifier transitions rather than unrelated modifier changes", () => {
      expect(CalendarDayButton).toBeDefined();
      const {rerender} = render(
        <>
          <input aria-label='Other control' />
          <CalendarDayButton
            day={day}
            modifiers={{focused: false}}>
            15
          </CalendarDayButton>
        </>,
      );
      const other = screen.getByRole("textbox");
      act(() => other.focus());
      expect(other).toHaveFocus();

      rerender(
        <>
          <input aria-label='Other control' />
          <CalendarDayButton
            day={day}
            modifiers={{focused: true}}>
            15
          </CalendarDayButton>
        </>,
      );
      expect(screen.getByRole("button")).toHaveFocus();
      act(() => other.focus());
      rerender(
        <>
          <input aria-label='Other control' />
          <CalendarDayButton
            day={day}
            modifiers={{focused: true, selected: true}}>
            15
          </CalendarDayButton>
        </>,
      );
      expect(other).toHaveFocus();
    });

    it("preserves native form, disabled and keyboard event contracts", async () => {
      expect(CalendarDayButton).toBeDefined();
      const user = userEvent.setup();
      let submits = 0;
      let keys = 0;
      const {rerender} = render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submits += 1;
          }}>
          <CalendarDayButton
            day={day}
            modifiers={{}}
            onKeyDown={() => {
              keys += 1;
            }}>
            15
          </CalendarDayButton>
        </form>,
      );

      await user.click(screen.getByRole("button"));
      await user.keyboard("{Enter}");
      expect(keys).toBe(1);
      expect(submits).toBe(0);
      rerender(
        <CalendarDayButton
          day={day}
          modifiers={{disabled: true}}
          disabled
          onClick={() => {
            submits += 1;
          }}>
          15
        </CalendarDayButton>,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toBeDisabled();
      expect(submits).toBe(0);
    });

    it("supports object ref attach/detach under StrictMode", () => {
      expect(CalendarDayButton).toBeDefined();
      const ref = createRef<HTMLButtonElement>();
      const {unmount} = render(
        <StrictMode>
          <CalendarDayButton
            ref={ref}
            day={day}
            modifiers={{focused: true}}>
            15
          </CalendarDayButton>
        </StrictMode>,
      );
      expect(ref.current).toBe(screen.getByRole("button"));
      expect(ref.current).toHaveFocus();
      unmount();
      expect(ref.current).toBeNull();
    });
  });

  it("renders without crashing", () => {
    // Arrange
    render(<Calendar />);

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = render(<Calendar className='custom-calendar' />);

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-calendar");
  });

  it("renders footer content", () => {
    // Arrange
    render(<Calendar footer={<div>Calendar footer content</div>} />);

    // Assert
    expect(screen.getByText("Calendar footer content")).toBeInTheDocument();
  });

  it("renders calendar day children from the date grid", () => {
    // Arrange
    render(<Calendar defaultMonth={new Date(2024, 0, 1)} />);

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByText("15")[0]).toBeInTheDocument();
  });

  it("preserves unhandled day picker classNames keys", () => {
    // Arrange
    render(
      <Calendar
        classNames={{
          month_grid: "custom-month-grid",
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toHaveClass("custom-month-grid");
  });

  it("uses the provided locale when formatting the month dropdown", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
        locale={fr}
      />,
    );

    // Assert
    expect(screen.getByRole("option", {name: /janv/i})).toBeInTheDocument();
  });

  it("does not leak the week prop onto the week number table cell", () => {
    // Arrange
    const {container} = render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        showWeekNumber
      />,
    );

    // Assert
    expect(container.querySelector("td[week]")).not.toBeInTheDocument();
  });

  it("renders calendar with mode='range'", () => {
    // Arrange
    render(
      <Calendar
        mode='range'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with showOutsideDays={false}", () => {
    // Arrange
    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        showOutsideDays={false}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with captionLayout='dropdown'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // Check that dropdown is rendered
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("renders calendar with captionLayout='dropdown-months'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown-months'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with captionLayout='dropdown-years'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown-years'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom buttonVariant", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='outline'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='destructive'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='destructive'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='secondary'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='secondary'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='link'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='link'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("uses custom formatters", () => {
    // Arrange
    const customFormatters = {
      formatMonthDropdown: (date: Date) => date.toLocaleString("en", {month: "long"}),
      formatDay: (date: Date) => date.getDate().toString(),
    };

    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
        formatters={customFormatters}
      />,
    );

    // Assert
    expect(screen.getByRole("option", {name: "January"})).toBeInTheDocument();
  });

  it("renders calendar without locale defaults to 'default'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom components prop", () => {
    // Arrange
    const CustomChevron = () => <span>→</span>;

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        components={{Chevron: CustomChevron}}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with mode='single' and selected date", () => {
    // Arrange
    const selected = new Date(2024, 0, 15);

    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        selected={selected}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with mode='multiple'", () => {
    // Arrange
    render(
      <Calendar
        mode='multiple'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with range selection", () => {
    // Arrange
    const selected = {
      from: new Date(2024, 0, 10),
      to: new Date(2024, 0, 20),
    };

    render(
      <Calendar
        mode='range'
        defaultMonth={new Date(2024, 0, 1)}
        selected={selected}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("merges custom classNames with default styles", () => {
    // Arrange
    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        classNames={{
          root: "custom-root",
          nav: "custom-nav",
          day: "custom-day",
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with disabled dates", () => {
    // Arrange
    const disabledDates = [new Date(2024, 0, 15)];

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        disabled={disabledDates}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom modifiers", () => {
    // Arrange
    const modifiers = {
      weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    };

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        modifiers={modifiers}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='default'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='default'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar and focuses a day button with focused modifier", async () => {
    // Arrange
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        modifiers={{
          focused: new Date(2024, 0, 15),
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // The day button with focused modifier should be in the document
    const dayButtons = screen.getAllByRole("button");
    expect(dayButtons.length).toBeGreaterThan(0);
  });
});
