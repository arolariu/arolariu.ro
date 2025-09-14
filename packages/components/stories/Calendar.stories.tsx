import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {Calendar} from "../dist";

const meta: Meta<typeof Calendar> = {
  title: "Design System/Calendar",
  component: Calendar,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Calendar Component**

A flexible date selection component built upon the powerful \`react-day-picker\` library, styled according to the shadcn/ui aesthetic. Allows users to view dates and select single dates, multiple dates, or date ranges.

**Core Component:**
*   \`<Calendar>\`: The main component that renders the date picker interface. It wraps \`react-day-picker\`'s \`DayPicker\` component.

**Key Features & Props (from \`react-day-picker\`):**
*   **Selection Modes (\`mode\` prop):**
    *   \`'single'\`: Allows selecting only one date. Requires \`selected\` (Date) and \`onSelect\` (function) props.
    *   \`'multiple'\`: Allows selecting multiple, non-contiguous dates. Requires \`selected\` (Date[]) and \`onSelect\` (function) props. Can use \`min\`/\`max\` props to limit the number of selected dates.
    *   \`'range'\`: Allows selecting a start and end date. Requires \`selected\` (DateRange) and \`onSelect\` (function) props.
    *   \`'default'\`: Equivalent to \`'single'\`.
*   **Navigation**: Built-in controls for navigating between months and years. Props like \`numberOfMonths\`, \`month\`, \`onMonthChange\`, \`fromYear\`, \`toYear\`, \`fromDate\`, \`toDate\` control display and navigation limits.
*   **Disabling Dates (\`disabled\` prop):** Accepts dates, date ranges, days of the week, or functions to specify dates that cannot be selected.
*   **Customization**: Supports extensive customization through props like \`modifiers\`, \`modifiersClassNames\`, \`styles\`, \`classNames\`, and custom components (\`components\` prop).
*   **Internationalization**: Supports different locales via the \`locale\` prop (using \`date-fns\` locales).
*   **Accessibility**: \`react-day-picker\` provides robust accessibility features, including keyboard navigation and ARIA attributes.

See the [shadcn/ui Calendar documentation](https://ui.shadcn.com/docs/components/calendar) and the [react-day-picker documentation](https://react-day-picker.js.org/) for comprehensive details.
        `,
      },
    },
  },
  argTypes: {
    mode: {
      options: ["single", "multiple", "range", "default"],
      control: {type: "select"},
      description: "The selection mode. `default` is single selection.",
      table: {
        defaultValue: {summary: "default"},
      },
    },
    selected: {
      control: "object",
      description: "The currently selected date(s) or range, depending on the mode.",
    },
    onSelect: {
      action: "selected",
      description: "Callback function invoked when a date or range is selected.",
    },
    numberOfMonths: {
      control: "number",
      description: "The number of months to display simultaneously.",
      table: {
        defaultValue: {summary: "1"},
      },
    },
    disabled: {
      control: "object",
      description: "Dates or date ranges that cannot be selected.",
    },
    // Other props like fromDate, toDate, month, onMonthChange etc. are available from react-day-picker
  },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

// Basic calendar
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A basic calendar in single selection mode. Click a date to select it.",
      },
    },
  },
  render: function BasicCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        className='rounded-md border'
        classNames={{}}
        formatters={{}}
        components={{}}
      />
    );
  },
};

// Calendar with range selection
export const RangeSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Calendar in range selection mode (`mode='range'`). Click the start date, then the end date. Shows two months via `numberOfMonths={2}`.",
      },
    },
  },
  render: function RangeSelectionCalendarStory() {
    const [range, setRange] = React.useState<{
      from: Date;
      to?: Date;
    }>({
      from: new Date(),
      to: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      })(),
    });
    return (
      <Calendar
        mode='range'
        selected={range}
        onSelect={setRange}
        className='rounded-md border'
        numberOfMonths={2}
        classNames={{}}
        formatters={{}}
        components={{}}
      />
    );
  },
};

// Multi-month calendar
export const MultiMonth: Story = {
  parameters: {
    docs: {
      description: {
        story: "Displays multiple months side-by-side using the `numberOfMonths` prop (here set to 2).",
      },
    },
  },
  render: function MultiMonthCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        className='rounded-md border'
        numberOfMonths={2}
        classNames={{}}
        formatters={{}}
        components={{}}
      />
    );
  },
};

// Calendar with disabled dates
export const DisabledDates: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates disabling specific dates or ranges using the `disabled` prop. Disabled dates are not interactive.",
      },
    },
  },
  render: function DisabledDatesCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const disabledDays = [
      new Date(),
      new Date(new Date().setDate(new Date().getDate() + 2)),
      new Date(new Date().setDate(new Date().getDate() + 5)),
      {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 10);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 15);
          return d;
        })(),
      },
    ];
    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        disabled={disabledDays}
        className='rounded-md border'
        classNames={{}}
        formatters={{}}
        components={{}}
      />
    );
  },
};

// Calendar with footer
export const WithFooter: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to add supplementary content (like the selected date display) below the calendar.",
      },
    },
  },
  render: function WithFooterCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <div className='space-y-4'>
        <Calendar
          mode='single'
          selected={date}
          onSelect={setDate}
          className='rounded-md border'
          classNames={{}}
          formatters={{}}
          components={{}}
        />
        <div className='text-center text-sm'>{date ? <p>Selected date: {date.toDateString()}</p> : <p>No date selected.</p>}</div>
      </div>
    );
  },
};

// Calendar with minimum and maximum dates
export const MinMaxDates: Story = {
  parameters: {
    docs: {
      description: {
        story: "Restricts selectable dates to a specific range using `disabled={{ before: ..., after: ... }}`.",
      },
    },
  },
  render: function MinMaxDatesCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    // Allow selection of dates from today to 30 days in the future
    const today = new Date();
    const thirtyDaysFromNow = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() + 30);
      return d;
    })();
    return (
      <div className='space-y-4'>
        <Calendar
          mode='single'
          selected={date}
          onSelect={setDate}
          disabled={{before: today, after: thirtyDaysFromNow}}
          className='rounded-md border'
          classNames={{}}
          formatters={{}}
          components={{}}
        />
        <div className='text-sm'>
          <p>Only dates from today to 30 days from now can be selected.</p>
        </div>
      </div>
    );
  },
};

// Calendar with custom styles
export const CustomStyles: Story = {
  parameters: {
    docs: {
      description: {
        story: "Applies custom CSS classes to the calendar and its elements using the `className` and `classNames` props for theming.",
      },
    },
  },
  render: function CustomStylesCalendarStory() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        className='rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
        classNames={{
          day_button: "hover:bg-blue-100 focus:bg-blue-100 dark:hover:bg-blue-900 dark:focus:bg-blue-900",
          selected:
            "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white dark:bg-blue-500 dark:text-white",
          today: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-50",
        }}
        formatters={{}}
        components={{}}
      />
    );
  },
};
