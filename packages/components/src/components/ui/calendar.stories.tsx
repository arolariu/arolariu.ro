"use client";

import {fr} from "date-fns/locale";
import {useRef, useState} from "react";
import {CalendarDay} from "react-day-picker";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Calendar, CalendarDayButton, type DateRange as CalendarDateRange} from "./calendar";
import styles from "./calendar.module.css";

const meta = {
  title: "Components/Data Display/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "DayPicker owns date selection, keyboard navigation and dropdowns. Styled classNames are appended; custom components replace defaults. Compose CalendarDayButton for locale-aware custom day content.",
      },
    },
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;
const january = new Date(2024, 0, 1);

function DefaultDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>(new Date(2024, 0, 15));
  return (
    <Calendar
      mode='single'
      defaultMonth={january}
      selected={date}
      onSelect={setDate}
      className={styles.storyFrame}
    />
  );
}

/** Controlled single-date selection with the default native day buttons. */
export const Default: Story = {render: () => <DefaultDemo />};

function DateRangeDemo(): React.JSX.Element {
  const [dateRange, setDateRange] = useState<CalendarDateRange | undefined>({
    from: new Date(2024, 0, 10),
    to: new Date(2024, 0, 18),
  });
  return (
    <Calendar
      mode='range'
      defaultMonth={january}
      selected={dateRange}
      onSelect={setDateRange}
      className={styles.storyFrame}
      numberOfMonths={2}
    />
  );
}

/** Two months with range start, middle and end state styling. */
export const DateRange: Story = {render: () => <DateRangeDemo />};

function MultipleSelectionDemo(): React.JSX.Element {
  const [dates, setDates] = useState<Date[] | undefined>([new Date(2024, 0, 10), new Date(2024, 0, 15)]);
  return (
    <Calendar
      mode='multiple'
      defaultMonth={january}
      selected={dates}
      onSelect={setDates}
      className={styles.storyFrame}
    />
  );
}

/** Multiple dates can be independently selected and removed. */
export const MultipleSelection: Story = {render: () => <MultipleSelectionDemo />};

function WithDisabledDatesDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <Calendar
      mode='single'
      defaultMonth={january}
      selected={date}
      onSelect={setDate}
      disabled={[{from: new Date(2024, 0, 1), to: new Date(2024, 0, 5)}, {dayOfWeek: [0, 6]}]}
      className={styles.storyFrame}
    />
  );
}

/** Disabled date intervals and weekends retain native disabled semantics. */
export const WithDisabledDates: Story = {render: () => <WithDisabledDatesDemo />};

function DisabledWeekendsDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <section className={styles.storyStack}>
      <h3 className={styles.storyHeading}>Select a weekday</h3>
      <p className={styles.storyDescription}>Weekends are disabled. Use arrow keys to move between available dates.</p>
      <Calendar
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        disabled={{dayOfWeek: [0, 6]}}
        className={styles.storyFrame}
        footer={date ? `Selected: ${date.toLocaleDateString("en-US")}` : "No date selected"}
      />
    </section>
  );
}

/** A disabled matcher participates in keyboard focus movement and selection. */
export const DisabledWeekends: Story = {render: () => <DisabledWeekendsDemo />};

function EventDayButton(props: Readonly<CalendarDayButton.Props>): React.JSX.Element {
  return (
    <CalendarDayButton {...props}>
      {props.children}
      {props.modifiers["event"] && (
        <span
          className={styles.eventDot}
          role='img'
          aria-label='Event scheduled'
        />
      )}
    </CalendarDayButton>
  );
}

function WithEventsDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <section className={styles.storyStack}>
      <h3 className={styles.storyHeading}>Custom day content</h3>
      <p className={styles.storyDescription}>Dots mark custom event modifiers while date labels, locale and selection remain intact.</p>
      <Calendar
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        modifiers={{event: [new Date(2024, 0, 5), new Date(2024, 0, 12), new Date(2024, 0, 20)]}}
        components={{DayButton: EventDayButton}}
        className={styles.storyFrame}
      />
    </section>
  );
}

/** A real CalendarDayButton composition preserves primitive props and children. */
export const WithEvents: Story = {render: () => <WithEventsDemo />};

/** Native month/year dropdowns with bounded navigation and ISO week numbers. */
export const DropdownCaptions: Story = {
  args: {
    mode: "single",
    defaultMonth: january,
    captionLayout: "dropdown",
    startMonth: new Date(2023, 0, 1),
    endMonth: new Date(2025, 11, 1),
    showWeekNumber: true,
    ISOWeek: true,
    className: styles.storyFrame,
  },
};

/** The calendar locale controls captions, day labels and day-button metadata. */
export const Localized: Story = {
  args: {
    mode: "single",
    defaultMonth: january,
    locale: fr,
    captionLayout: "dropdown",
    className: styles.storyFrame,
  },
};

/** Right-to-left keyboard movement, chevrons and logical range edges. */
export const RightToLeft: Story = {
  args: {
    mode: "range",
    defaultMonth: january,
    dir: "rtl",
    selected: {from: new Date(2024, 0, 10), to: new Date(2024, 0, 18)},
    className: styles.storyFrame,
  },
};

function AnimatedDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <section className={styles.storyStack}>
      <p className={styles.storyDescription}>
        Navigate months to inspect motion. The public ref and DayPicker animation ref share one root.
      </p>
      <Calendar
        animate
        ref={rootRef}
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        className={styles.storyFrame}
      />
    </section>
  );
}

/** DayPicker's real animated DOM lifecycle with token-based/reduced motion CSS. */
export const Animated: Story = {render: () => <AnimatedDemo />};

function StandaloneDayButtonDemo(): React.JSX.Element {
  const [selected, setSelected] = useState(true);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <section className={styles.storyStack}>
      <p className={styles.storyDescription}>The public day button exposes native refs, locale-aware metadata and custom content.</p>
      <div className={styles.storyDayCell}>
        <CalendarDayButton
          ref={ref}
          day={new CalendarDay(new Date(2024, 0, 15), january)}
          modifiers={{selected}}
          locale={fr}
          aria-label='January 15, 2024'
          aria-pressed={selected}
          onClick={() => setSelected((value) => !value)}>
          15
        </CalendarDayButton>
      </div>
      <Button
        variant='outline'
        onClick={() => ref.current?.focus()}>
        Focus day button
      </Button>
    </section>
  );
}

/** Standalone exported component; focus the forwarded ref or toggle selection. */
export const StandaloneDayButton: Story = {render: () => <StandaloneDayButtonDemo />};
