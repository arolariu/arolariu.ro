import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Calendar} from "./calendar";

const meta = {
  title: "Components/Data Display/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default calendar with single date selection.
 */
export const Default: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        className='rounded-md border'
      />
    );
  },
};

/**
 * Calendar with date range selection.
 */
export const DateRange: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [dateRange, setDateRange] = useState<{from: Date; to?: Date} | undefined>({
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return (
      <Calendar
        mode='range'
        selected={dateRange}
        onSelect={setDateRange}
        className='rounded-md border'
        numberOfMonths={2}
      />
    );
  },
};

/**
 * Calendar with multiple date selection.
 */
export const MultipleSelection: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [dates, setDates] = useState<Date[] | undefined>([new Date(), new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)]);

    return (
      <Calendar
        mode='multiple'
        selected={dates}
        onSelect={setDates}
        className='rounded-md border'
      />
    );
  },
};

/**
 * Calendar with disabled dates and custom styling.
 */
export const WithDisabledDates: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [date, setDate] = useState<Date | undefined>(undefined);

    const disabledDays = [
      {from: new Date(2024, 0, 1), to: new Date(2024, 0, 5)},
      {dayOfWeek: [0, 6]}, // Disable weekends
    ];

    return (
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        disabled={disabledDays}
        className='rounded-md border'
      />
    );
  },
};
