import type {Meta, StoryObj} from "@storybook/react-vite";
import {Checkbox} from "./checkbox";

const meta = {
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "select",
      options: [true, false, "indeterminate"],
      description: "The checked state",
    },
    disabled: {
      control: "boolean",
      description: "Whether the checkbox is disabled",
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    checked: "indeterminate",
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const CheckedDisabled: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};
