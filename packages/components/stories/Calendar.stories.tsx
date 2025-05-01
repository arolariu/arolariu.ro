import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Calendar } from "../dist";
import { addDays } from "date-fns";

const meta: Meta<typeof Calendar> = {
  title: "Design System/Calendar",
  component: Calendar,
};

export default meta;

type Story = StoryObj<typeof Calendar>;

// Basic calendar
export const Basic: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

// Calendar with range selection
export const RangeSelection: Story = {
  render: () => {
    const [range, setRange] = React.useState<{
      from: Date;
      to?: Date;
    }>({
      from: new Date(),
      to: addDays(new Date(), 7),
    });

    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        className="rounded-md border"
        numberOfMonths={2}
      />
    );
  },
};

// Multi-month calendar
export const MultiMonth: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
        numberOfMonths={2}
      />
    );
  },
};

// Calendar with disabled dates
export const DisabledDates: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const disabledDays = [
      new Date(),
      new Date(new Date().setDate(new Date().getDate() + 2)),
      new Date(new Date().setDate(new Date().getDate() + 5)),
      { from: addDays(new Date(), 10), to: addDays(new Date(), 15) },
    ];

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={disabledDays}
        className="rounded-md border"
      />
    );
  },
};

// Calendar with footer
export const WithFooter: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
        <div className="text-sm text-center">
          {date ? (
            <p>Selected date: {date.toDateString()}</p>
          ) : (
            <p>No date selected.</p>
          )}
        </div>
      </div>
    );
  },
};

// Calendar with minimum and maximum dates
export const MinMaxDates: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    // Allow selection of dates from today to 30 days in the future
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    return (
      <div className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: today, after: thirtyDaysFromNow }}
          className="rounded-md border"
        />
        <div className="text-sm">
          <p>Only dates from today to 30 days from now can be selected.</p>
        </div>
      </div>
    );
  },
};

// Calendar with custom styles
export const CustomStyles: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
        classNames={{
          day_button:
            "hover:bg-blue-100 focus:bg-blue-100 dark:hover:bg-blue-900 dark:focus:bg-blue-900",
          selected:
            "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white dark:bg-blue-500 dark:text-white",
          today: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-50",
        }}
      />
    );
  },
};
