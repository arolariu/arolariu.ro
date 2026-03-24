import {Bold, Italic} from "lucide-react";
import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Toggle} from "./toggle";

const meta = {
  title: "Components/Actions/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default toggle button.
 */
export const Default: Story = {
  render: () => <Toggle aria-label='Toggle bold'>Bold</Toggle>,
};

/**
 * Toggle with icon.
 */
export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label='Toggle italic'>
      <Italic className='h-4 w-4' />
    </Toggle>
  ),
};

/**
 * Controlled toggle showing pressed state.
 */
function ControlledDemo() {
  const [pressed, setPressed] = React.useState(false);

  return (
    <div className='space-y-4'>
      <Toggle
        pressed={pressed}
        onPressedChange={setPressed}
        aria-label='Toggle bold'>
        <Bold className='mr-2 h-4 w-4' />
        Bold
      </Toggle>
      <p className='text-muted-foreground text-sm'>Status: {pressed ? "Pressed" : "Not pressed"}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};
