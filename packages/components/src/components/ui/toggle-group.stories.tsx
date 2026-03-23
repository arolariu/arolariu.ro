import {AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline} from "lucide-react";
import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ToggleGroup, ToggleGroupItem} from "./toggle-group";

const meta = {
  title: "Components/Actions/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Single selection toggle group.
 */
export const Single: Story = {
  render: () => (
    <ToggleGroup defaultValue={["center"]}>
      <ToggleGroupItem
        value='left'
        aria-label='Align left'>
        <AlignLeft className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='center'
        aria-label='Align center'>
        <AlignCenter className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='right'
        aria-label='Align right'>
        <AlignRight className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

/**
 * Multiple selection toggle group.
 */
export const Multiple: Story = {
  render: () => (
    <ToggleGroup
      defaultValue={["bold"]}
      toggleMultiple>
      <ToggleGroupItem
        value='bold'
        aria-label='Toggle bold'>
        <Bold className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='italic'
        aria-label='Toggle italic'>
        <Italic className='h-4 w-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='underline'
        aria-label='Toggle underline'>
        <Underline className='h-4 w-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

/**
 * Controlled toggle group with multiple selections.
 */
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = React.useState<string[]>(["bold", "italic"]);

    return (
      <div className='space-y-4'>
        <ToggleGroup
          value={value}
          onValueChange={(newValue) => setValue(newValue)}
          toggleMultiple>
          <ToggleGroupItem
            value='bold'
            aria-label='Toggle bold'>
            <Bold className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='italic'
            aria-label='Toggle italic'>
            <Italic className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem
            value='underline'
            aria-label='Toggle underline'>
            <Underline className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
        <p className='text-muted-foreground text-sm'>Selected: {value.join(", ") || "none"}</p>
      </div>
    );
  },
};
