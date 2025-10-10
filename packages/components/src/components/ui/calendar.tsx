"use client";

import {ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon} from "lucide-react";
import * as React from "react";
import {DayButton, DayPicker, getDefaultClassNames} from "react-day-picker";

import {Button, buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utilities";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-white p-3 [--cell-size:2rem] dark:bg-neutral-950 [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", {month: "short"}),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({variant: buttonVariant}),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({variant: buttonVariant}),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn("flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]", defaultClassNames.month_caption),
        dropdowns: cn("flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium", defaultClassNames.dropdowns),
        dropdown_root: cn(
          "has-focus:border-neutral-950 border-neutral-200 shadow-xs has-focus:ring-neutral-950/50 has-focus:ring-[3px] relative rounded-md border dark:has-focus:border-neutral-300 dark:border-neutral-800 dark:has-focus:ring-neutral-300/50",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("bg-white absolute inset-0 opacity-0 dark:bg-neutral-950", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-neutral-500 flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5 dark:[&>svg]:text-neutral-400",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-neutral-500 flex-1 select-none rounded-md text-[0.8rem] font-normal dark:text-neutral-400",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-[--cell-size] select-none", defaultClassNames.week_number_header),
        week_number: cn("text-neutral-500 select-none text-[0.8rem] dark:text-neutral-400", defaultClassNames.week_number),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day,
        ),
        range_start: cn("bg-neutral-100 rounded-l-md dark:bg-neutral-800", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-neutral-100 rounded-r-md dark:bg-neutral-800", defaultClassNames.range_end),
        today: cn(
          "bg-neutral-100 text-neutral-900 rounded-md data-[selected=true]:rounded-none dark:bg-neutral-800 dark:text-neutral-50",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-neutral-500 aria-selected:text-neutral-500 dark:text-neutral-400 dark:aria-selected:text-neutral-400",
          defaultClassNames.outside,
        ),
        disabled: cn("text-neutral-500 opacity-50 dark:text-neutral-400", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({className, rootRef, ...props}) => {
          return (
            <div
              data-slot='calendar'
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({className, orientation, ...props}) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn("size-4", className)}
              {...props}
            />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({children, ...props}) => {
          return (
            <td {...props}>
              <div className='flex size-[--cell-size] items-center justify-center text-center'>{children}</div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({className, day, modifiers, ...props}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers["focused"]) ref.current?.focus();
  }, [modifiers["focused"]]);

  return (
    <Button
      ref={ref}
      variant='ghost'
      size='icon'
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers["selected"] && !modifiers["range_start"] && !modifiers["range_end"] && !modifiers["range_middle"]}
      data-range-start={modifiers["range_start"]}
      data-range-end={modifiers["range_end"]}
      data-range-middle={modifiers["range_middle"]}
      className={cn(
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:bg-neutral-900 data-[range-end=true]:text-neutral-50 data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-neutral-100 data-[range-middle=true]:text-neutral-900 data-[range-start=true]:rounded-md data-[range-start=true]:bg-neutral-900 data-[range-start=true]:text-neutral-50 data-[selected-single=true]:bg-neutral-900 data-[selected-single=true]:text-neutral-50 dark:data-[range-end=true]:bg-neutral-50 dark:data-[range-end=true]:text-neutral-900 dark:data-[range-middle=true]:bg-neutral-800 dark:data-[range-middle=true]:text-neutral-50 dark:data-[range-start=true]:bg-neutral-50 dark:data-[range-start=true]:text-neutral-900 dark:data-[selected-single=true]:bg-neutral-50 dark:data-[selected-single=true]:text-neutral-900 [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export {Calendar, CalendarDayButton};
