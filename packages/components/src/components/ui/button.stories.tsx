import type {Meta, StoryObj} from "@storybook/react-vite";
import {Button} from "./button";

const meta = {
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
      description: "Size preset",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button should ignore user interaction",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
    size: "default",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
    size: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
    size: "default",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
    size: "default",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
    size: "default",
  },
};

export const Small: Story = {
  args: {
    children: "Small",
    variant: "default",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large",
    variant: "default",
    size: "lg",
  },
};

export const Icon: Story = {
  args: {
    children: "🚀",
    variant: "default",
    size: "icon",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    variant: "default",
    size: "default",
    disabled: true,
  },
};
