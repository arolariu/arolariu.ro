import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import {CheckboxGroup} from "./checkbox-group";

const meta = {
  title: "Components/Forms/CheckboxGroup",
  component: CheckboxGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic checkbox group with multiple options.
 */
export const Default: Story = {
  render: () => (
    <CheckboxGroup defaultValue={["news"]}>
      <Checkbox value='news'>Newsletter</Checkbox>
      <Checkbox value='events'>Events</Checkbox>
      <Checkbox value='updates'>Product Updates</Checkbox>
    </CheckboxGroup>
  ),
};

/**
 * Checkbox group with pre-selected values.
 */
export const MultipleSelected: Story = {
  render: () => (
    <CheckboxGroup defaultValue={["news", "events"]}>
      <Checkbox value='news'>Newsletter</Checkbox>
      <Checkbox value='events'>Events</Checkbox>
      <Checkbox value='updates'>Product Updates</Checkbox>
    </CheckboxGroup>
  ),
};

/**
 * Controlled checkbox group.
 */
function ControlledDemo() {
  const [value, setValue] = React.useState<string[]>(["events"]);

  return (
    <div className='space-y-4'>
      <CheckboxGroup
        value={value}
        onValueChange={(newValue) => setValue(newValue)}>
        <Checkbox value='news'>Newsletter</Checkbox>
        <Checkbox value='events'>Events</Checkbox>
        <Checkbox value='updates'>Product Updates</Checkbox>
      </CheckboxGroup>
      <p className='text-muted-foreground text-sm'>Selected: {value.join(", ") || "none"}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};
