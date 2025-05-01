import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CountingNumber, Button } from "../dist";

const meta: Meta<typeof CountingNumber> = {
  title: "Design System/Counting Number",
  component: CountingNumber,
};

export default meta;

type Story = StoryObj<typeof CountingNumber>;

// Basic counting number
export const Basic: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        Basic number animation from 0 to 100
      </p>
      <div className="text-4xl font-bold">
        <CountingNumber number={100} />
      </div>
    </div>
  ),
};

// With custom starting number
export const CustomStartingNumber: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        Animation starts from 50 and goes to 100
      </p>
      <div className="text-4xl font-bold">
        <CountingNumber number={100} fromNumber={50} />
      </div>
    </div>
  ),
};

// With decimal places
export const WithDecimalPlaces: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        Animation with 2 decimal places
      </p>
      <div className="text-4xl font-bold">
        <CountingNumber number={123.45} decimalPlaces={2} />
      </div>
    </div>
  ),
};

// With padded zeros
export const WithPaddedZeros: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        Numbers padded to match final length
      </p>
      <div className="space-y-4">
        <div className="text-4xl font-bold">
          <CountingNumber number={123} padStart={true} />
        </div>
        <div className="text-4xl font-bold">
          <CountingNumber number={1234.56} padStart={true} decimalPlaces={2} />
        </div>
      </div>
    </div>
  ),
};

// Custom decimal separator
export const CustomDecimalSeparator: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground mb-2">
        Using comma as decimal separator
      </p>
      <div className="text-4xl font-bold">
        <CountingNumber
          number={1234.56}
          decimalPlaces={2}
          decimalSeparator=","
        />
      </div>
    </div>
  ),
};

// Custom transition
export const CustomTransition: Story = {
  render: () => (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Fast transition (high stiffness)
          </p>
          <div className="text-4xl font-bold">
            <CountingNumber
              number={1000}
              transition={{ stiffness: 200, damping: 30 }}
            />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Slow transition (low stiffness)
          </p>
          <div className="text-4xl font-bold">
            <CountingNumber
              number={1000}
              transition={{ stiffness: 40, damping: 30 }}
            />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Bouncy transition (low damping)
          </p>
          <div className="text-4xl font-bold">
            <CountingNumber
              number={1000}
              transition={{ stiffness: 150, damping: 8 }}
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Interactive example
export const Interactive: Story = {
  render: function InteractiveExample() {
    const [number, setNumber] = React.useState(0);
    const incrementBy = 123;

    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl font-bold">
          <CountingNumber number={number} />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setNumber((prev) => Math.max(0, prev - incrementBy))}
            variant="outline"
          >
            Decrease
          </Button>
          <Button onClick={() => setNumber((prev) => prev + incrementBy)}>
            Increase
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNumber(0)} variant="secondary">
            Reset
          </Button>
          <Button onClick={() => setNumber(1000)} variant="secondary">
            Set to 1000
          </Button>
        </div>
      </div>
    );
  },
};

// Scroll-triggered animation
export const ScrollTriggered: Story = {
  render: () => (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-2">
        Scroll down to see the animation trigger
      </p>
      <div
        style={{ height: "400px" }}
        className="flex items-end justify-center"
      >
        <div className="border p-10 rounded-lg shadow-sm">
          <div className="text-center">
            <h3 className="text-lg font-medium">Total Users</h3>
            <div className="text-5xl font-bold mt-2">
              <CountingNumber
                number={25684}
                inView={true}
                inViewMargin="-100px"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Multiple counters stats dashboard
export const StatsDashboard: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Total Users
        </div>
        <div className="text-3xl font-bold mt-2">
          <CountingNumber number={28945} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Revenue
        </div>
        <div className="text-3xl font-bold mt-2">
          $<CountingNumber number={87431.59} decimalPlaces={2} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Conversion Rate
        </div>
        <div className="text-3xl font-bold mt-2">
          <CountingNumber number={4.7} decimalPlaces={1} />%
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Active Sessions
        </div>
        <div className="text-3xl font-bold mt-2">
          <CountingNumber number={1358} />
        </div>
      </div>
    </div>
  ),
};
