import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./../src/components/ui/button";
import "./../src/index.css";

const meta: Meta<typeof Button> = {
  title: "Design System/Button",
  component: Button,
};

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  render: () => <Button className="text-red-500 bg-blue">Button</Button>,
};
export const DestructiveButton: Story = {
  args: {
    variant: "destructive",
    content: "Destructive",
  },
};
export const DisabledButton: Story = {
  args: {
    disabled: true,
    content: "Disabled",
  },
};

export default meta;
