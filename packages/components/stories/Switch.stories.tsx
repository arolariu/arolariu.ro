import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Label, Switch } from "../dist";

const meta: Meta<typeof Switch> = {
  title: "Design System/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: {
    disabled: false,
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
    defaultChecked: {
      control: "boolean",
      description: "Whether the switch is checked by default",
    },
    checked: {
      control: "boolean",
      description: "Controlled checked state of the switch",
    },
    onCheckedChange: {
      action: "checked changed",
      description: "Event handler called when the checked state changes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {},
  render: (args) => <Switch {...args} />,
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" {...args} />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledSwitch() {
    const [checked, setChecked] = React.useState(false);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="controlled-switch"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Label htmlFor="controlled-switch">{checked ? "On" : "Off"}</Label>
        </div>
        <p className="text-sm text-neutral-500">
          The switch is {checked ? "on" : "off"}
        </p>
        <button
          onClick={() => setChecked(!checked)}
          className="w-fit px-4 py-2 bg-neutral-900 text-white rounded-md dark:bg-neutral-50 dark:text-neutral-900"
        >
          Toggle
        </button>
      </div>
    );
  },
};

export const FormExample: Story = {
  render: function FormSwitch() {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          alert(
            `Form submitted! Marketing emails: ${
              formData.get("marketing") ? "Yes" : "No"
            }`
          );
        }}
        className="w-full max-w-sm space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch id="marketing" name="marketing" defaultChecked />
            <Label htmlFor="marketing">Receive marketing emails</Label>
          </div>
          <p className="text-sm text-neutral-500">
            Get notified about new products, features, and more.
          </p>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-neutral-900 text-white rounded-md dark:bg-neutral-50 dark:text-neutral-900"
        >
          Save preferences
        </button>
      </form>
    );
  },
};
