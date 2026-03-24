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
function DefaultDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode='single'
      selected={date}
      onSelect={setDate}
      className='rounded-md border'
    />
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

/**
 * Calendar with date range selection.
 */
function DateRangeDemo() {
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
}

export const DateRange: Story = {
  render: () => <DateRangeDemo />,
};

/**
 * Calendar with multiple date selection.
 */
function MultipleSelectionDemo() {
  const [dates, setDates] = useState<Date[] | undefined>([new Date(), new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)]);

  return (
    <Calendar
      mode='multiple'
      selected={dates}
      onSelect={setDates}
      className='rounded-md border'
    />
  );
}

export const MultipleSelection: Story = {
  render: () => <MultipleSelectionDemo />,
};

/**
 * Calendar with disabled dates and custom styling.
 */
function WithDisabledDatesDemo() {
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
}

export const WithDisabledDates: Story = {
  render: () => <WithDisabledDatesDemo />,
};

/**
 * Calendar with specific dates disabled (weekends only).
 */
function DisabledWeekendsDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
      <div>
        <h3 style={{fontSize: "16px", fontWeight: 600, marginBottom: "4px"}}>Select a Weekday</h3>
        <p style={{fontSize: "14px", color: "#6b7280"}}>Weekends are disabled for booking</p>
      </div>
      <Calendar
        mode='single'
        selected={date}
        onSelect={setDate}
        disabled={(date) => date.getDay() === 0 || date.getDay() === 6}
        style={{border: "1px solid #e5e7eb", borderRadius: "8px"}}
      />
      {date && (
        <p style={{fontSize: "14px", color: "#3b82f6"}}>
          Selected: {date.toLocaleDateString("en-US", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}
        </p>
      )}
    </div>
  );
}

export const DisabledWeekends: Story = {
  render: () => <DisabledWeekendsDemo />,
};

/**
 * Calendar with dots indicating events on certain dates.
 */
function WithEventsDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const eventDates = [
    new Date(2024, 11, 5).toDateString(),
    new Date(2024, 11, 12).toDateString(),
    new Date(2024, 11, 20).toDateString(),
    new Date(2024, 11, 25).toDateString(),
  ];

  return (
    <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
      <div>
        <h3 style={{fontSize: "16px", fontWeight: 600, marginBottom: "4px"}}>Event Calendar</h3>
        <div style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#6b7280"}}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#3b82f6",
            }}
          />
          <span>Event scheduled</span>
        </div>
      </div>
      <div style={{position: "relative"}}>
        <Calendar
          mode='single'
          selected={date}
          onSelect={setDate}
          style={{border: "1px solid #e5e7eb", borderRadius: "8px"}}
          modifiers={{
            event: (date) => eventDates.includes(date.toDateString()),
          }}
          modifiersStyles={{
            event: {
              position: "relative",
            },
          }}
        />
      </div>
      <div
        style={{
          padding: "12px",
          background: "#f3f4f6",
          borderRadius: "6px",
        }}>
        <h4 style={{fontSize: "14px", fontWeight: 600, marginBottom: "8px"}}>Upcoming Events:</h4>
        <ul style={{fontSize: "14px", color: "#6b7280", listStyle: "none", padding: 0}}>
          <li style={{marginBottom: "4px"}}>Dec 5 - Team Meeting</li>
          <li style={{marginBottom: "4px"}}>Dec 12 - Product Launch</li>
          <li style={{marginBottom: "4px"}}>Dec 20 - Client Review</li>
          <li>Dec 25 - Holiday</li>
        </ul>
      </div>
    </div>
  );
}

export const WithEvents: Story = {
  render: () => <WithEventsDemo />,
};
