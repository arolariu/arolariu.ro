import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Switch} from "./switch";
const storyStyles = `
.ac-story-switch-storyRow {
  display: flex;
  align-items: center;
  gap: var(--ac-space-3);
  font-size: var(--ac-text-sm);
}

.ac-story-switch-storyStack {
  display: grid;
  gap: var(--ac-space-4);
}
`;

const storyClasses = {
  storyRow: "ac-story-switch-storyRow",
  storyStack: "ac-story-switch-storyStack",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: {"aria-label": "Setting"},
  argTypes: {
    defaultChecked: {control: "boolean"},
    disabled: {control: "boolean"},
    size: {control: "select", options: ["default", "sm"]},
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {args: {defaultChecked: false}};
export const On: Story = {args: {defaultChecked: true}};
export const Disabled: Story = {args: {disabled: true}};
export const OnDisabled: Story = {args: {defaultChecked: true, disabled: true}};

export const WithLabel: Story = {
  render: () => (
    <label className={storyClasses.storyRow}>
      <Switch name='airplane' />
      Airplane mode
    </label>
  ),
};

export const Small: Story = {
  render: () => (
    <div className={storyClasses.storyStack}>
      <label className={storyClasses.storyRow}>
        <Switch defaultChecked />
        Default size
      </label>
      <label className={storyClasses.storyRow}>
        <Switch
          size='sm'
          defaultChecked
        />
        Small size
      </label>
    </div>
  ),
};

export const RightToLeft: Story = {
  render: () => (
    <div
      dir='rtl'
      className={storyClasses.storyStack}>
      <label className={storyClasses.storyRow}>
        <Switch defaultChecked />
        Default RTL
      </label>
      <label className={storyClasses.storyRow}>
        <Switch
          size='sm'
          defaultChecked
        />
        Small RTL
      </label>
    </div>
  ),
};

function ControlledDemo(): React.JSX.Element {
  const [checked, setChecked] = React.useState(false);
  return (
    <div className={storyClasses.storyStack}>
      <label className={storyClasses.storyRow}>
        <Switch
          checked={checked}
          onCheckedChange={setChecked}
          render={(props, state) => (
            <span
              {...props}
              data-contract-checked={String(state.checked)}
            />
          )}
        />
        Enabled
      </label>
      <output>{checked ? "On" : "Off"}</output>
    </div>
  );
}

export const Controlled: Story = {render: () => <ControlledDemo />};
export const NativeComposition: Story = {
  render: () => (
    <Switch
      aria-label='Native switch'
      nativeButton
      render={<button />}
    />
  ),
};
