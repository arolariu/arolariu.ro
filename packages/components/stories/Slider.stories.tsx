import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "../dist";

const meta: Meta<typeof Slider> = {
  title: "Design System/Slider",
  component: Slider,
};

export default meta;

type Story = StoryObj<typeof Slider>;

// Basic slider
export const Basic: Story = {
  render: () => <Slider defaultValue={[50]} className="w-[300px]" />,
};

// Range slider
export const Range: Story = {
  render: () => <Slider defaultValue={[25, 75]} className="w-[300px]" />,
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
};

// Disabled slider
export const Disabled: Story = {
  render: () => <Slider defaultValue={[30]} disabled className="w-[300px]" />,
};
