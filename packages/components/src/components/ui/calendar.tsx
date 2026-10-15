"use client";

import {ChevronDown, ChevronLeft, ChevronRight} from "lucide-react";
import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  Root,
  type CustomComponents,
  type DateRange,
  type DayButtonProps,
  type DayPickerProps,
  type Matcher,
} from "react-day-picker";

import {Button, buttonVariants, type ButtonVariant} from "@/components/ui/button";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";

import styles from "./calendar.module.css";

type DayPickerComponents = NonNullable<DayPickerProps["components"]>;
type CalendarWeekNumberProps = React.ComponentProps<NonNullable<DayPickerComponents["WeekNumber"]>>;
type CalendarRootProps = React.ComponentProps<NonNullable<DayPickerComponents["Root"]>>;
type CalendarChevronProps = React.ComponentProps<NonNullable<DayPickerComponents["Chevron"]>>;

interface CalendarContextValue {
  readonly forwardedRef: React.Ref<HTMLDivElement> | undefined;
  readonly locale: DayPickerProps["locale"];
  readonly RootComponent: NonNullable<DayPickerComponents["Root"]>;
  readonly flipNavigationChevron: boolean;
  readonly DayButtonComponent: React.ComponentType<DayButtonProps>;
}

const CalendarContext = React.createContext<CalendarContextValue | null>(null);
const defaultClassNames = getDefaultClassNames();
const emptyClassNames: NonNullable<DayPickerProps["classNames"]> = {};

function CalendarRoot({className, rootRef, ...props}: Readonly<CalendarRootProps>): React.JSX.Element {
  const context = React.useContext(CalendarContext);
  const mergedRef = useMergedRefs(rootRef, context?.forwardedRef);
  const RootComponent = context?.RootComponent ?? Root;

  return (
    <RootComponent
      data-slot='calendar'
      rootRef={mergedRef}
      className={cn(styles.calendarRoot, className)}
      {...props}
    />
  );
}

/** DayPicker overrides, additionally accepting ref-forwarding day components. */
type CalendarComponents = Readonly<
  Omit<Partial<CustomComponents>, "DayButton"> & {
    /** Replaces the default day button; may compose {@link CalendarDayButton}. */
    DayButton?: React.ComponentType<DayButtonProps>;
  }
>;

type CalendarSelectionProps<Props extends DayPickerProps> = Props extends DayPickerProps
  ? Readonly<
      Omit<Props, "components"> & {
        /** Consumer components replace defaults; a custom Root receives merged refs. */
        components?: CalendarComponents;
        /** Ref to the root div, merged with DayPicker's animation ref. */
        ref?: React.Ref<HTMLDivElement>;
        /**
         * Visual variant applied to the navigation buttons.
         * @default "ghost"
         */
        buttonVariant?: ButtonVariant;
      }
    >
  : never;

/**
 * Readonly DayPicker 10 props, retaining its discriminated selection-mode union.
 */
type CalendarProps = CalendarSelectionProps<DayPickerProps>;

/**
 * Readonly native DayPicker day-button props with an optional locale override.
 * A surrounding {@link Calendar} supplies its locale when this prop is omitted.
 * The public ref targets the native HTML button.
 */
type CalendarDayButtonProps = Readonly<
  DayButtonProps & {
    /** Locale used for `data-day`; defaults to the surrounding Calendar locale. */
    locale?: DayPickerProps["locale"];
    /**
     * Ref to the native day button, merged with the focused-modifier ref.
     */
    ref?: React.Ref<HTMLButtonElement>;
  }
>;

function CalendarChevron({className, orientation, ...props}: Readonly<CalendarChevronProps>): React.JSX.Element {
  const context = React.useContext(CalendarContext);
  const horizontal = orientation === "left" || orientation === "right";
  const resolvedOrientation = horizontal && context?.flipNavigationChevron ? (orientation === "left" ? "right" : "left") : orientation;
  const Icon = resolvedOrientation === "left" ? ChevronLeft : resolvedOrientation === "right" ? ChevronRight : ChevronDown;
  return (
    <Icon
      className={cn(styles.chevron, className)}
      {...props}
    />
  );
}

function CalendarDayButtonAdapter(props: Readonly<DayButtonProps>): React.JSX.Element {
  const context = React.useContext(CalendarContext);
  const DayButtonComponent = context?.DayButtonComponent ?? CalendarDayButton;
  return <DayButtonComponent {...props} />;
}

/**
 * Renders a styled calendar built on top of `react-day-picker`.
 *
 * @remarks
 * - Renders the `DayPicker` calendar root
 * - Built on `react-day-picker` with shared button styling from the component library
 * DayPicker owns selection, range, keyboard, RTL, dropdown, and disabled behavior.
 * Styled `classNames` are appended to CSS Module and canonical `rdp-*` hooks;
 * unstyled keys follow DayPicker's replacement semantics.
 * Animation class overrides must be single DOM tokens and supply their own CSS;
 * DayPicker passes those names directly to `classList.add`/`remove`.
 * Consumer formatters and components replace the corresponding defaults.
 * A custom `Root` still receives the merged public/animation `rootRef` and must
 * attach it to its root div. Custom day content can compose CalendarDayButton
 * without losing the calendar locale, native handlers, or modifier metadata.
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
  ref: forwardedRef,
  className,
  classNames = emptyClassNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: Readonly<Calendar.Props>): React.JSX.Element {
  const RootComponent = components?.Root ?? Root;
  const DayButtonComponent = components?.DayButton ?? CalendarDayButton;
  // DayPicker's Nav uses physical chevrons; the "around" layout already handles RTL.
  const flipNavigationChevron = props.dir === "rtl" && props.navLayout !== "around";
  const context = React.useMemo(
    () => ({forwardedRef, locale, RootComponent, flipNavigationChevron, DayButtonComponent}),
    [forwardedRef, locale, RootComponent, flipNavigationChevron, DayButtonComponent],
  );
  return (
    <CalendarContext.Provider value={context}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn(styles.container, className)}
        captionLayout={captionLayout}
        locale={locale}
        formatters={{
          formatMonthDropdown: (date) => date.toLocaleString(locale?.code, {month: "short"}),
          ...formatters,
        }}
        classNames={{
          ...defaultClassNames,
          ...classNames,
          root: cn(defaultClassNames.root, styles.root, classNames.root),
          months: cn(defaultClassNames.months, styles.months, classNames.months),
          month: cn(defaultClassNames.month, styles.month, classNames.month),
          nav: cn(defaultClassNames.nav, styles.nav, classNames.nav),
          button_previous: cn(
            defaultClassNames.button_previous,
            buttonVariants({variant: buttonVariant, size: "icon"}),
            styles.navButton,
            styles.navPrevious,
            classNames.button_previous,
          ),
          button_next: cn(
            defaultClassNames.button_next,
            buttonVariants({variant: buttonVariant, size: "icon"}),
            styles.navButton,
            styles.navNext,
            classNames.button_next,
          ),
          month_caption: cn(defaultClassNames.month_caption, styles.monthCaption, classNames.month_caption),
          dropdowns: cn(defaultClassNames.dropdowns, styles.dropdowns, classNames.dropdowns),
          dropdown_root: cn(defaultClassNames.dropdown_root, styles.dropdownRoot, classNames.dropdown_root),
          dropdown: cn(defaultClassNames.dropdown, styles.dropdown, classNames.dropdown),
          caption_label: cn(
            defaultClassNames.caption_label,
            styles.captionLabel,
            captionLayout !== "label" && styles.captionLabelDropdown,
            classNames.caption_label,
          ),
          month_grid: cn(defaultClassNames.month_grid, styles.monthGrid, classNames.month_grid),
          weekdays: cn(defaultClassNames.weekdays, styles.weekdays, classNames.weekdays),
          weekday: cn(defaultClassNames.weekday, styles.weekday, classNames.weekday),
          week: cn(defaultClassNames.week, styles.week, classNames.week),
          week_number_header: cn(defaultClassNames.week_number_header, styles.weekNumberHeader, classNames.week_number_header),
          week_number: cn(defaultClassNames.week_number, styles.weekNumber, classNames.week_number),
          day: cn(defaultClassNames.day, styles.day, classNames.day),
          day_button: cn(defaultClassNames.day_button, classNames.day_button),
          range_start: cn(defaultClassNames.range_start, styles.rangeStart, classNames.range_start),
          range_middle: cn(defaultClassNames.range_middle, styles.rangeMiddle, classNames.range_middle),
          range_end: cn(defaultClassNames.range_end, styles.rangeEnd, classNames.range_end),
          today: cn(defaultClassNames.today, styles.today, classNames.today),
          outside: cn(defaultClassNames.outside, styles.outside, classNames.outside),
          disabled: cn(defaultClassNames.disabled, classNames.disabled),
          hidden: cn(defaultClassNames.hidden, styles.hidden, classNames.hidden),
        }}
        components={{
          Chevron: CalendarChevron,
          WeekNumber: CalendarWeekNumber,
          ...components,
          Root: CalendarRoot,
          DayButton: CalendarDayButtonAdapter,
        }}
        {...props}
      />
    </CalendarContext.Provider>
  );
}

function CalendarWeekNumber({week, children, ...tdProps}: Readonly<CalendarWeekNumberProps>): React.JSX.Element {
  return (
    <td {...tdProps}>
      <div className={styles.weekNumberCell}>{children}</div>
    </td>
  );
}

/**
 * A native, ref-forwarding day button for DayPicker component composition.
 *
 * @remarks
 * Keeps primitive-provided children, handlers, disabled/ARIA semantics and refs.
 * Focus moves only when the focused modifier becomes true. `data-day` follows
 * the explicit/surrounding locale; selected/range/outside/today/focused data
 * attributes expose day state without leaking `day`, `modifiers` or `locale`
 * to the DOM. Defaults to `type="button"` to avoid accidental form submission.
 */
function CalendarDayButton({
  ref: forwardedRef,
  className,
  day,
  modifiers,
  locale,
  "aria-label": ariaLabel,
  type = "button",
  ...props
}: Readonly<CalendarDayButton.Props>): React.JSX.Element {
  const context = React.useContext(CalendarContext);
  const ref = React.useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(ref, forwardedRef);
  const focused = Boolean(modifiers["focused"]);

  React.useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  return (
    <Button
      ref={mergedRef}
      variant='ghost'
      size='icon'
      aria-label={ariaLabel ?? day.date.toLocaleDateString((locale ?? context?.locale)?.code, {dateStyle: "full"})}
      type={type}
      data-slot='calendar-day-button'
      data-day={day.date.toLocaleDateString((locale ?? context?.locale)?.code)}
      data-selected={Boolean(modifiers["selected"])}
      data-selected-single={Boolean(
        modifiers["selected"] && !modifiers["range_start"] && !modifiers["range_end"] && !modifiers["range_middle"],
      )}
      data-range-start={Boolean(modifiers["range_start"])}
      data-range-end={Boolean(modifiers["range_end"])}
      data-range-middle={Boolean(modifiers["range_middle"])}
      data-focused={focused}
      data-outside={Boolean(modifiers["outside"])}
      data-today={Boolean(modifiers["today"])}
      className={cn(defaultClassNames.day_button, styles.dayButton, className)}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
CalendarDayButton.displayName = "CalendarDayButton";

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace Calendar {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias
  export type Props = CalendarProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias
  export type Components = CalendarComponents;
}

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace CalendarDayButton {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias
  export type Props = CalendarDayButtonProps;
}

export {Calendar, CalendarDayButton};
export type {CalendarComponents, CalendarDayButtonProps, CalendarProps, DateRange, DayPickerProps, Matcher};
