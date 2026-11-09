import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";
import {CheckboxGroup} from "./checkbox-group";

const storyStyles = `
.ac-story-checkbox-group-row {
  display: flex;
  align-items: center;
  gap: var(--ac-space-2);
}
.ac-story-checkbox-group-demo {
  display: grid;
  gap: var(--ac-space-4);
}
`;

const meta = {
  title: "Components/Forms/CheckboxGroup",
  component: CheckboxGroup,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  parameters: {layout: "centered"},
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function NotificationOptions(): React.JSX.Element {
  return (
    <>
      {[
        ["news", "Newsletter"],
        ["events", "Events"],
        ["updates", "Product updates"],
      ].map(([value, label]) => (
        <label
          key={value}
          className='ac-story-checkbox-group-row'>
          <Checkbox value={value} />
          {label}
        </label>
      ))}
    </>
  );
}

export const Default: Story = {
  render: () => (
    <CheckboxGroup
      aria-label='Notifications'
      defaultValue={["news"]}>
      <NotificationOptions />
    </CheckboxGroup>
  ),
};

export const MultipleSelected: Story = {
  render: () => (
    <CheckboxGroup
      aria-label='Notifications'
      defaultValue={["news", "events"]}>
      <NotificationOptions />
    </CheckboxGroup>
  ),
};

function ControlledDemo(): React.JSX.Element {
  const [value, setValue] = React.useState<string[]>(["events"]);
  return (
    <div className='ac-story-checkbox-group-demo'>
      <CheckboxGroup
        aria-label='Notifications'
        value={value}
        onValueChange={setValue}>
        <NotificationOptions />
      </CheckboxGroup>
      <output>Selected: {value.join(", ") || "none"}</output>
    </div>
  );
}

export const Controlled: Story = {render: () => <ControlledDemo />};
