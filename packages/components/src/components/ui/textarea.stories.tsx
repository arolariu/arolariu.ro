import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Textarea} from "./textarea";

const meta = {
  title: "Components/Forms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default textarea with placeholder.
 */
export const Default: Story = {
  args: {
    placeholder: "Enter your message here...",
    rows: 4,
  },
};

/**
 * Textarea with default value.
 */
export const WithValue: Story = {
  args: {
    defaultValue: "This is a pre-filled message that can be edited.",
    rows: 5,
  },
};

/**
 * Disabled textarea.
 */
export const Disabled: Story = {
  args: {
    placeholder: "This textarea is disabled",
    disabled: true,
    rows: 4,
  },
};
