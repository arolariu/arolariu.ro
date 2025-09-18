import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {Button, CountingNumber} from "../dist";

const meta: Meta<typeof CountingNumber> = {
  title: "Design System/Counting Number",
  component: CountingNumber,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Counting Number Component**

A custom component that animates a numerical value from a starting point to a target end value. Leverages the \`framer-motion\` library for smooth animation and \`react-intersection-observer\` for triggering the animation when the component enters the viewport.

**Core Component:**
*   \`<CountingNumber>\`: The main component that renders the animated number within a \`<span>\`.

**Key Features & Props:**
*   **Animation**: Animates the displayed number from \`fromNumber\` (default: 0) to the target \`number\`.
*   **Formatting**:
    *   \`decimalPlaces\`: Specifies the number of digits to show after the decimal point.
    *   \`decimalSeparator\`: Defines the character used for the decimal point (default: '.').
    *   \`padStart\`: If true, pads the integer part with spaces to maintain consistent width during animation, preventing layout shifts.
*   **Animation Control**:
    *   \`transition\`: Accepts a Framer Motion \`Transition\` object to customize the animation physics (e.g., \`{ type: 'spring', stiffness: 100, damping: 20 }\` or \`{ duration: 0.8 }\`).
    *   \`inView\`: If true, the animation starts only when the component becomes visible in the viewport.
    *   \`inViewMargin\`: Defines the margin around the viewport for triggering the \`inView\` animation (uses Intersection Observer \`rootMargin\`).
*   **Styling**: Accepts a \`className\` prop to apply custom CSS classes to the wrapping \`<span>\`.

**Technical Details:**
*   Uses \`motion.span\` from Framer Motion to render the number.
*   Creates a MotionValue (\`useMotionValue\`) initialized with \`fromNumber\`.
*   Uses \`useTransform\` to format the MotionValue into a string with the specified decimal places and separator.
*   An effect (\`useEffect\`) triggers the animation (\`animate(motionValue, number, transition)\`) when the target \`number\` changes or when the component enters the view (if \`inView\` is true).
*   Uses \`react-intersection-observer\` (\`useInView\`) to detect when the component is visible.
        `,
      },
    },
  },
  argTypes: {
    number: {
      control: "number",
      description: "The target number to animate to.",
    },
    fromNumber: {
      control: "number",
      description: "The number to start the animation from.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    decimalPlaces: {
      control: "number",
      description: "The number of decimal places to display.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    decimalSeparator: {
      control: "text",
      description: "The character to use as the decimal separator.",
      table: {
        defaultValue: {summary: "."},
      },
    },
    padStart: {
      control: "boolean",
      description: "Whether to pad the start of the number with spaces to maintain consistent width during animation.",
      table: {
        defaultValue: {summary: false},
      },
    },
    transition: {
      control: "object",
      description: "Framer Motion transition properties (e.g., `{ stiffness, damping, duration }`).",
    },
    inView: {
      control: "boolean",
      description: "If true, the animation only starts when the component enters the viewport.",
      table: {
        defaultValue: {summary: false},
      },
    },
    inViewMargin: {
      control: "text",
      description: "Margin around the viewport for triggering the inView animation (e.g., '-100px'). Requires `inView` to be true.",
    },
    className: {
      control: "text",
      description: "Optional CSS class name for the wrapping span.",
    },
  },
};

export default meta;

type Story = StoryObj<typeof CountingNumber>;

// Basic counting number
export const Basic: Story = {
  args: {
    number: 100,
  },
  parameters: {
    docs: {
      description: {
        story: "Animates from the default `fromNumber` (0) to the target `number` (100).",
      },
    },
  },
  render: (args) => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Basic number animation from 0 to 100</p>
      <div className='text-4xl font-bold'>
        <CountingNumber {...args} />
      </div>
    </div>
  ),
};

// With custom starting number
export const CustomStartingNumber: Story = {
  args: {
    number: 100,
    fromNumber: 50,
  },
  parameters: {
    docs: {
      description: {
        story: "Starts the animation from a specified `fromNumber` (50) instead of 0.",
      },
    },
  },
  render: (args) => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Animation starts from 50 and goes to 100</p>
      <div className='text-4xl font-bold'>
        <CountingNumber {...args} />
      </div>
    </div>
  ),
};

// With decimal places
export const WithDecimalPlaces: Story = {
  args: {
    number: 123.45,
    decimalPlaces: 2,
  },
  parameters: {
    docs: {
      description: {
        story: "Displays the number with a specified number of `decimalPlaces` (2).",
      },
    },
  },
  render: (args) => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Animation with 2 decimal places</p>
      <div className='text-4xl font-bold'>
        <CountingNumber {...args} />
      </div>
    </div>
  ),
};

// With padded zeros
export const WithPaddedZeros: Story = {
  args: {
    padStart: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Uses `padStart={true}` to maintain consistent width during animation by padding with spaces.",
      },
    },
  },
  render: (args) => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Numbers padded to match final length</p>
      <div className='space-y-4'>
        <div className='text-4xl font-bold'>
          <CountingNumber
            number={123}
            {...args}
          />
        </div>
        <div className='text-4xl font-bold'>
          <CountingNumber
            number={1234.56}
            decimalPlaces={2}
            {...args}
          />
        </div>
      </div>
    </div>
  ),
};

// Custom decimal separator
export const CustomDecimalSeparator: Story = {
  args: {
    number: 1234.56,
    decimalPlaces: 2,
    decimalSeparator: ",",
  },
  parameters: {
    docs: {
      description: {
        story: "Uses a comma (`,`) as the `decimalSeparator` instead of the default period (`.`).",
      },
    },
  },
  render: (args) => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Using comma as decimal separator</p>
      <div className='text-4xl font-bold'>
        <CountingNumber {...args} />
      </div>
    </div>
  ),
};

// Custom transition
export const CustomTransition: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates customizing the animation physics using the `transition` prop (adjusting `stiffness` and `damping`).",
      },
    },
  },
  render: () => (
    <div className='flex flex-col items-center justify-center gap-4 p-4'>
      <div className='space-y-4'>
        <div>
          <p className='text-muted-foreground mb-2 text-sm'>Fast transition (high stiffness)</p>
          <div className='text-4xl font-bold'>
            <CountingNumber
              number={1000}
              transition={{stiffness: 200, damping: 30}}
            />
          </div>
        </div>
        <div>
          <p className='text-muted-foreground mb-2 text-sm'>Slow transition (low stiffness)</p>
          <div className='text-4xl font-bold'>
            <CountingNumber
              number={1000}
              transition={{stiffness: 40, damping: 30}}
            />
          </div>
        </div>
        <div>
          <p className='text-muted-foreground mb-2 text-sm'>Bouncy transition (low damping)</p>
          <div className='text-4xl font-bold'>
            <CountingNumber
              number={1000}
              transition={{stiffness: 150, damping: 8}}
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Interactive example
export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how the component reacts to dynamic changes in the target `number` prop.",
      },
    },
  },
  render: function InteractiveExample() {
    const [number, setNumber] = React.useState(0);
    const incrementBy = 123;

    return (
      <div className='flex flex-col items-center justify-center gap-4 p-4'>
        <div className='text-5xl font-bold'>
          <CountingNumber number={number} />
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={() => setNumber((prev) => Math.max(0, prev - incrementBy))}
            variant='outline'>
            Decrease
          </Button>
          <Button onClick={() => setNumber((prev) => prev + incrementBy)}>Increase</Button>
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={() => setNumber(0)}
            variant='secondary'>
            Reset
          </Button>
          <Button
            onClick={() => setNumber(1000)}
            variant='secondary'>
            Set to 1000
          </Button>
        </div>
      </div>
    );
  },
};

// Scroll-triggered animation
export const ScrollTriggered: Story = {
  args: {
    number: 25684,
    inView: true,
    inViewMargin: "-100px",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Uses `inView={true}` to delay the animation until the component scrolls into the viewport. `inViewMargin` adjusts the trigger point.",
      },
    },
  },
  render: (args) => (
    <div className='p-4'>
      <p className='text-muted-foreground mb-2 text-sm'>Scroll down to see the animation trigger</p>
      <div
        style={{height: "400px"}}
        className='flex items-end justify-center'>
        <div className='rounded-lg border p-10 shadow-sm'>
          <div className='text-center'>
            <h3 className='text-lg font-medium'>Total Users</h3>
            <div className='mt-2 text-5xl font-bold'>
              <CountingNumber {...args} />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Multiple counters stats dashboard
export const StatsDashboard: Story = {
  parameters: {
    docs: {
      description: {
        story: "Illustrates a common use case: displaying multiple statistics in a dashboard layout.",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4'>
      <div className='rounded-lg bg-white p-4 shadow dark:bg-gray-800'>
        <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>Total Users</div>
        <div className='mt-2 text-3xl font-bold'>
          <CountingNumber number={28945} />
        </div>
      </div>
      <div className='rounded-lg bg-white p-4 shadow dark:bg-gray-800'>
        <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>Revenue</div>
        <div className='mt-2 text-3xl font-bold'>
          $
          <CountingNumber
            number={87431.59}
            decimalPlaces={2}
          />
        </div>
      </div>
      <div className='rounded-lg bg-white p-4 shadow dark:bg-gray-800'>
        <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>Conversion Rate</div>
        <div className='mt-2 text-3xl font-bold'>
          <CountingNumber
            number={4.7}
            decimalPlaces={1}
          />
          %
        </div>
      </div>
      <div className='rounded-lg bg-white p-4 shadow dark:bg-gray-800'>
        <div className='text-sm font-medium text-gray-500 dark:text-gray-400'>Active Sessions</div>
        <div className='mt-2 text-3xl font-bold'>
          <CountingNumber number={1358} />
        </div>
      </div>
    </div>
  ),
};
