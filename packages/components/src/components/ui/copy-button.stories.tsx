import type {Meta, StoryObj} from "@storybook/react-vite";
import {CopyButton} from "./copy-button";

const meta = {
  component: CopyButton,
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "Text to copy to clipboard",
    },
    timeout: {
      control: "number",
      description: "Duration (ms) to show success state",
    },
  },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "npm install @arolariu/components",
  },
};

export const ShortTimeout: Story = {
  args: {
    value: "Copy me!",
    timeout: 1000,
  },
};

export const LongText: Story = {
  args: {
    value: "This is a very long text that will be copied to the clipboard when you click the button.",
  },
};
