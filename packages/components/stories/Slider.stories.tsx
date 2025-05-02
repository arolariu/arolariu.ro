import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "../dist";

const meta: Meta<typeof Slider> = {
  title: "Design System/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Slider Component**

Allows users to select a value or a range of values from within a specified numerical range by dragging a thumb along a track. Built upon the Radix UI Slider primitive.

**Core Components (from Radix UI):**
*   \`<Slider>\`: The root component (\`<span>\`) that contains the track and thumb(s). Manages the slider's value and state. Accepts props like \`value\`, \`defaultValue\`, \`onValueChange\`, \`min\`, \`max\`, \`step\`, \`orientation\`, \`dir\`, \`disabled\`, \`minStepsBetweenThumbs\`, \`inverted\`.
*   \`<SliderTrack>\`: (Used internally by shadcn/ui \`<Slider>\`) The visual representation (\`<span>\`) of the slider's track.
*   \`<SliderRange>\`: (Used internally by shadcn/ui \`<Slider>\`) The visual representation (\`<span>\`) of the selected range on the track (between the start and the thumb, or between two thumbs).
*   \`<SliderThumb>\`: (Used internally by shadcn/ui \`<Slider>\`) The draggable handle (\`<span>\` with \`role="slider"\`) that the user interacts with to change the value. Automatically rendered based on the \`value\`/\`defaultValue\` array length. Handles ARIA attributes (\`aria-valuenow\`, \`aria-valuemin\`, \`aria-valuemax\`, \`aria-orientation\`, \`aria-label\` - requires explicit labeling).

**Key Features & Props:**
*   **Single Value / Range**: Supports both single thumb sliders (provide a single number in the \`value\`/\`defaultValue\` array) and range sliders with multiple thumbs (provide multiple numbers).
*   **Range Constraints**: Define the minimum (\`min\`, default 0), maximum (\`max\`, default 100), and step interval (\`step\`, default 1) for the slider values.
*   **Orientation**: Supports \`'horizontal'\` (default) and \`'vertical'\` orientations.
*   **State Management**: Supports controlled (\`value\`, \`onValueChange\`) and uncontrolled (\`defaultValue\`) state. \`value\` is always an array of numbers.
*   **Accessibility**: Provides keyboard navigation (Arrow keys, Home, End, PageUp, PageDown) and ARIA roles/attributes. Requires proper labeling (e.g., using \`aria-label\` or \`aria-labelledby\` on the thumb, often managed via the root component in custom implementations) for screen reader users.
*   **Styling**: Styled using Tailwind CSS, allowing customization of the track, range, and thumb appearance.

See the [shadcn/ui Slider documentation](https://ui.shadcn.com/docs/components/slider) and the [Radix UI Slider documentation](https://www.radix-ui.com/primitives/docs/components/slider) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Slider>;

// Basic slider
export const Basic: Story = {
  render: () => <Slider defaultValue={[50]} className="w-[300px]" />,
  parameters: {
    docs: {
      description: {
        story:
          "A basic Slider allowing selection of a single value within the default range (0-100).",
      },
    },
  },
};

// Range slider
export const Range: Story = {
  render: () => <Slider defaultValue={[25, 75]} className="w-[300px]" />,
  parameters: {
    docs: {
      description: {
        story:
          "A Slider configured to select a range of values, indicated by two thumbs on the track.",
      },
    },
  },
};

// Slider with value display
export const WithValueDisplay: Story = {
  render: function SliderWithValue() {
    const [value, setValue] = useState<number[]>([50]);

    return (
      <div className="space-y-4 w-[300px]">
        <div className="flex justify-between">
          <span className="text-sm">Value: {value}</span>
        </div>
        <Slider value={value} onValueChange={setValue} className="w-full" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "An example of a controlled Slider where the selected value(s) are managed by React state.",
      },
    },
  },
};

// Range slider with value display
export const RangeWithValueDisplay: Story = {
  render: function RangeSliderWithValue() {
    const [range, setRange] = useState<number[]>([25, 75]);

    return (
      <div className="space-y-4 w-[300px]">
        <div className="flex justify-between">
          <span className="text-sm">Min: {range[0]}</span>
          <span className="text-sm">Max: {range[1]}</span>
        </div>
        <Slider value={range} onValueChange={setRange} className="w-full" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "An example of a controlled Slider where the selected value(s) are managed by React state.",
      },
    },
  },
};

// Stepped slider
export const Stepped: Story = {
  render: function SteppedSlider() {
    const [value, setValue] = useState<number[]>([40]);

    return (
      <div className="space-y-4 w-[300px]">
        <div className="flex justify-between">
          <span className="text-sm">Value: {value}</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          className="w-full"
          step={10}
          min={0}
          max={100}
        />
        <div className="flex justify-between px-1 text-xs text-neutral-500">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "A Slider with a defined step value, restricting the selectable values to specific increments.",
      },
    },
  },
};

// Custom styled slider
export const CustomStyled: Story = {
  render: function CustomStyledSlider() {
    return (
      <div className="space-y-8 w-[300px]">
        <div className="space-y-2">
          <div className="text-sm font-medium">Default</div>
          <Slider defaultValue={[50]} className="w-full" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Blue</div>
          <Slider
            defaultValue={[50]}
            className="w-full"
            trackClassName="bg-blue-100 dark:bg-blue-900/30"
            rangeClassName="bg-blue-600 dark:bg-blue-500"
            thumbClassName="border-blue-600 ring-blue-500/20"
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Green</div>
          <Slider
            defaultValue={[50]}
            className="w-full"
            trackClassName="bg-green-100 dark:bg-green-900/30"
            rangeClassName="bg-green-600 dark:bg-green-500"
            thumbClassName="border-green-600 ring-green-500/20"
          />
        </div>
      </div>
    );
  },
};

// Vertical slider
export const Vertical: Story = {
  render: () => (
    <div className="h-[200px]">
      <Slider defaultValue={[50]} orientation="vertical" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A Slider oriented vertically instead of the default horizontal layout.",
      },
    },
  },
};

// Disabled slider
export const Disabled: Story = {
  render: () => <Slider defaultValue={[30]} disabled className="w-[300px]" />,
  parameters: {
    docs: {
      description: {
        story: "A disabled Slider component that prevents user interaction.",
      },
    },
  },
};
