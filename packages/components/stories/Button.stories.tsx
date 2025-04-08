import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import "./../src/index.css";
import { Button } from "../dist";


const meta: Meta<typeof Button> = {
  title: "Design System/Button",
  component: Button,
};

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  render: () => <Button size='default' variant='default' className="text-red-500 bg-blue">Button</Button>,
};
export const DestructiveButton: Story = {
  render: () => (
    <Button size='default' variant="destructive" className="text-red-500 bg-blue">
      Destructive
    </Button>
  ),  
};
export const DisabledButton: Story = {
  render: () => (
    <Button size='default' variant='default' disabled className="text-red-500 bg-blue">
      Disabled
    </Button>
  ),
};

export default meta;
