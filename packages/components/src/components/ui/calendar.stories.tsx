"use client";

import {fr} from "date-fns/locale";
import {useRef, useState} from "react";
import {CalendarDay} from "react-day-picker";
import type {Decorator, Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Calendar, CalendarDayButton, type DateRange as CalendarDateRange, type DayPickerProps} from "./calendar";
const storyStyles = `
.ac-story-calendar-storyFrame {
  border: 1px solid var(--ac-border);
}

.ac-story-calendar-storyStack {
  display: flex;
  max-width: 24rem;
  flex-direction: column;
  gap: var(--ac-space-3);
}

.ac-story-calendar-storyHeading {
  margin: 0;
  color: var(--ac-foreground);
  font-size: var(--ac-text-base);
  font-weight: 600;
}

.ac-story-calendar-storyDescription {
  margin: 0;
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
  line-height: 1.5;
}

.ac-story-calendar-storyDayCell {
  width: var(--ac-size-default);
}

.ac-story-calendar-eventDot {
  width: var(--ac-space-1);
  height: var(--ac-space-1);
  border-radius: 50%;
  background-color: currentColor;
}
`;

const storyClasses = {
  storyFrame: "ac-story-calendar-storyFrame",
  storyStack: "ac-story-calendar-storyStack",
  storyHeading: "ac-story-calendar-storyHeading",
  storyDescription: "ac-story-calendar-storyDescription",
  storyDayCell: "ac-story-calendar-storyDayCell",
  eventDot: "ac-story-calendar-eventDot",
} as const;

const meta = {
  decorators: [
    (Story: Parameters<Decorator>[0]) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
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
      className={storyClasses.storyFrame}
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
      className={storyClasses.storyFrame}
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
      className={storyClasses.storyFrame}
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
      className={storyClasses.storyFrame}
    />
  );
}

/** Disabled date intervals and weekends retain native disabled semantics. */
export const WithDisabledDates: Story = {render: () => <WithDisabledDatesDemo />};

function DisabledWeekendsDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <section className={storyClasses.storyStack}>
      <h3 className={storyClasses.storyHeading}>Select a weekday</h3>
      <p className={storyClasses.storyDescription}>Weekends are disabled. Use arrow keys to move between available dates.</p>
      <Calendar
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        disabled={{dayOfWeek: [0, 6]}}
        className={storyClasses.storyFrame}
        footer={date ? `Selected: ${date.toLocaleDateString("en-US")}` : "No date selected"}
      />
    </section>
  );
}

/** A disabled matcher participates in keyboard focus movement and selection. */
export const DisabledWeekends: Story = {render: () => <DisabledWeekendsDemo />};

/** Decorative event dots; the event itself is announced through the day button's DayPicker label. */
function EventDayButton(props: Readonly<CalendarDayButton.Props>): React.JSX.Element {
  return (
    <CalendarDayButton {...props}>
      {props.children}
      {props.modifiers["event"] && (
        <span
          className={storyClasses.eventDot}
          aria-hidden='true'
        />
      )}
    </CalendarDayButton>
  );
}

type LabelDayButton = NonNullable<NonNullable<DayPickerProps["labels"]>["labelDayButton"]>;

/**
 * DayPicker names every day button with `aria-label`, so custom children never reach the accessible name. Put the
 * meaningful day content in the label instead; a custom label replaces DayPicker's default, so keep its today and
 * selected states too.
 */
const labelEventDay: LabelDayButton = (date, modifiers, _options, dateLib) => {
  const day = dateLib?.format(date, "PPPP") ?? date.toDateString();
  const parts = [modifiers["today"] ? `Today, ${day}` : day];
  if (modifiers["event"]) parts.push("event scheduled");
  if (modifiers["selected"]) parts.push("selected");
  return parts.join(", ");
};

function WithEventsDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <section className={storyClasses.storyStack}>
      <h3 className={storyClasses.storyHeading}>Custom day content</h3>
      <p className={storyClasses.storyDescription}>
        Dots mark custom event modifiers. The day button&apos;s label says &quot;event scheduled&quot;, so the dots stay decorative.
      </p>
      <Calendar
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        modifiers={{event: [new Date(2024, 0, 5), new Date(2024, 0, 12), new Date(2024, 0, 20)]}}
        labels={{labelDayButton: labelEventDay}}
        components={{DayButton: EventDayButton}}
        className={storyClasses.storyFrame}
      />
    </section>
  );
}

/** Custom day content composes CalendarDayButton; meaningful content goes into DayPicker's `labels.labelDayButton`. */
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
    className: storyClasses.storyFrame,
  },
};

/** Direct month-child buttons stay around each caption in LTR and RTL. */
export const AroundNavigation: Story = {
  args: {mode: "single", defaultMonth: january, navLayout: "around", numberOfMonths: 2, dir: "ltr", className: storyClasses.storyFrame},
};

/** The last month's caption precedes its grouped toolbar, including tab order. */
export const AfterNavigation: Story = {
  args: {
    mode: "single",
    defaultMonth: january,
    captionLayout: "dropdown",
    navLayout: "after",
    numberOfMonths: 2,
    dir: "rtl",
    className: storyClasses.storyFrame,
  },
};

/** The calendar locale controls captions, day labels and day-button metadata. */
export const Localized: Story = {
  args: {
    mode: "single",
    defaultMonth: january,
    locale: fr,
    captionLayout: "dropdown",
    className: storyClasses.storyFrame,
  },
};

/** Right-to-left keyboard movement, chevrons and logical range edges. */
export const RightToLeft: Story = {
  args: {
    mode: "range",
    defaultMonth: january,
    dir: "rtl",
    selected: {from: new Date(2024, 0, 10), to: new Date(2024, 0, 18)},
    className: storyClasses.storyFrame,
  },
};

function AnimatedDemo(): React.JSX.Element {
  const [date, setDate] = useState<Date | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <section className={storyClasses.storyStack}>
      <p className={storyClasses.storyDescription}>
        Navigate months to inspect motion. The public ref and DayPicker animation ref share one root.
      </p>
      <Calendar
        animate
        ref={rootRef}
        mode='single'
        defaultMonth={january}
        selected={date}
        onSelect={setDate}
        className={storyClasses.storyFrame}
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
    <section className={storyClasses.storyStack}>
      <p className={storyClasses.storyDescription}>The public day button exposes native refs, locale-aware metadata and custom content.</p>
      <div className={storyClasses.storyDayCell}>
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
