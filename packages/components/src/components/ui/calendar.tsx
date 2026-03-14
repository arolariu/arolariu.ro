"use client";

/* eslint-disable complexity, react/no-unstable-nested-components, react-x/no-nested-component-definitions, react/prop-types */

import {ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon} from "lucide-react";
import * as React from "react";
import {DayButton, DayPicker} from "react-day-picker";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utilities";

import buttonStyles from "./button.module.css";
import styles from "./calendar.module.css";

type CalendarButtonVariant = NonNullable<React.ComponentProps<typeof Button>["variant"]>;
type DayPickerComponents = NonNullable<React.ComponentProps<typeof DayPicker>["components"]>;
type CalendarWeekNumberProps = React.ComponentProps<NonNullable<DayPickerComponents["WeekNumber"]>>;

/**
 * Props for the shared calendar component.
 */
type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /**
   * Visual variant applied to the navigation buttons.
   * @default "ghost"
   */
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
};

const calendarButtonVariantStyles: Record<CalendarButtonVariant, string> = {
  default: buttonStyles.default,
  destructive: buttonStyles.destructive,
  ghost: buttonStyles.ghost,
  link: buttonStyles.link,
  outline: buttonStyles.outline,
  secondary: buttonStyles.secondary,
};

/**
 * Renders a styled calendar built on top of `react-day-picker`.
 *
 * @remarks
 * - Renders the `DayPicker` calendar root
 * - Built on `react-day-picker` with shared button styling from the component library
 * - Preserves the V1 public API while aligning visuals with the current design system
 * - Overrides the default DayPicker `Root`, `Chevron`, `DayButton`, and `WeekNumber`
 *   components while still allowing consumers to replace them through the `components` prop
 * - Override the default chevron icons with `components={{Chevron: YourChevronComponent}}`
 *
 * @example
 * ```tsx
 * <Calendar
 *   mode='single'
 *   selected={new Date()}
 *   onSelect={(date) => console.log(date)}
 * />
 * ```
 *
 * @see {@link https://daypicker.dev | React Day Picker Docs}
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: Readonly<CalendarProps>): React.JSX.Element {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(styles.container, className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => {
          const locale = props.locale;

          return date.toLocaleString(locale?.code ?? "default", {month: "short"});
        },
        ...formatters,
      }}
      classNames={{
        ...classNames,
        root: cn(styles.root, classNames?.root),
        months: cn(styles.months, classNames?.months),
        month: cn(styles.month, classNames?.month),
        nav: cn(styles.nav, classNames?.nav),
        button_previous: cn(
          buttonStyles.button,
          buttonStyles.sizeIcon,
          calendarButtonVariantStyles[buttonVariant],
          styles.navButton,
          classNames?.button_previous,
        ),
        button_next: cn(
          buttonStyles.button,
          buttonStyles.sizeIcon,
          calendarButtonVariantStyles[buttonVariant],
          styles.navButton,
          classNames?.button_next,
        ),
        month_caption: cn(styles.monthCaption, classNames?.month_caption),
        dropdowns: cn(styles.dropdowns, classNames?.dropdowns),
        dropdown_root: cn(styles.dropdownRoot, classNames?.dropdown_root),
        dropdown: cn(styles.dropdown, classNames?.dropdown),
        caption_label: cn(styles.captionLabel, captionLayout !== "label" && styles.captionLabelDropdown, classNames?.caption_label),
        month_grid: cn(styles.monthGrid, classNames?.month_grid),
        weekdays: cn(styles.weekdays, classNames?.weekdays),
        weekday: cn(styles.weekday, classNames?.weekday),
        week: cn(styles.week, classNames?.week),
        week_number_header: cn(styles.weekNumberHeader, classNames?.week_number_header),
        week_number: cn(styles.weekNumber, classNames?.week_number),
        day: cn(styles.day, classNames?.day),
        range_start: cn(styles.rangeStart, classNames?.range_start),
        range_middle: cn(styles.rangeMiddle, classNames?.range_middle),
        range_end: cn(styles.rangeEnd, classNames?.range_end),
        today: cn(styles.today, classNames?.today),
        outside: cn(styles.outside, classNames?.outside),
        disabled: classNames?.disabled,
        hidden: cn(styles.hidden, classNames?.hidden),
      }}
      components={{
        Root: ({className: rootClassName, rootRef, ...rootProps}) => (
          <div
            data-slot='calendar'
            ref={rootRef}
            className={cn(styles.calendarRoot, rootClassName)}
            {...rootProps}
          />
        ),
        Chevron: ({className: chevronClassName, orientation, ...chevronProps}) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn(styles.chevron, chevronClassName)}
                {...chevronProps}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn(styles.chevron, chevronClassName)}
                {...chevronProps}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn(styles.chevron, chevronClassName)}
              {...chevronProps}
            />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: CalendarWeekNumber,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarWeekNumber({week, children, ...tdProps}: Readonly<CalendarWeekNumberProps>): React.JSX.Element {
  return (
    <td {...tdProps}>
      <div className={styles.weekNumberCell}>{children}</div>
    </td>
  );
}

function CalendarDayButton({className, day, modifiers, ...props}: Readonly<React.ComponentProps<typeof DayButton>>): React.JSX.Element {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers["focused"]) {
      ref.current?.focus();
    }
  }, [modifiers]);

  return (
    <Button
      ref={ref}
      variant='ghost'
      size='icon'
      data-day={day.date.toLocaleDateString()}
      data-selected-single={Boolean(
        modifiers["selected"] && !modifiers["range_start"] && !modifiers["range_end"] && !modifiers["range_middle"],
      )}
      data-range-start={Boolean(modifiers["range_start"])}
      data-range-end={Boolean(modifiers["range_end"])}
      data-range-middle={Boolean(modifiers["range_middle"])}
      className={cn(styles.dayButton, className)}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export type {DateRange, DayPickerProps, Matcher} from "react-day-picker";
export {Calendar};
export type {CalendarProps};
