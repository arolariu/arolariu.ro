import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Slider} from "./slider";

const meta = {
  title: "Components/Forms/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default slider with single value.
 */
export const Default: Story = {
  render: () => (
    <div className='w-64'>
      <Slider
        defaultValue={[50]}
        min={0}
        max={100}
      />
    </div>
  ),
};

/**
 * Slider with custom range and step.
 */
export const CustomRange: Story = {
  render: () => (
    <div className='w-64 space-y-4'>
      <div>
        <p className='text-muted-foreground mb-2 text-sm'>Price range: $0 - $1000</p>
        <Slider
          defaultValue={[250]}
          min={0}
          max={1000}
          step={50}
        />
      </div>
    </div>
  ),
};

/**
 * Controlled slider showing current value.
 */
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = React.useState([30]);

    return (
      <div className='w-64 space-y-4'>
        <div className='flex justify-between'>
          <span className='text-sm'>Volume</span>
          <span className='text-sm font-medium'>{value[0]}%</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          min={0}
          max={100}
        />
      </div>
    );
  },
};
