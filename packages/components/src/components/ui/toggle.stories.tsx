import type {Meta, StoryObj} from "storybook-react-rsbuild";
import React from "react";
import {Bold, Italic, Underline} from "lucide-react";
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
  render: () => <Toggle aria-label="Toggle bold">Bold</Toggle>,
};

/**
 * Toggle with icon.
 */
export const WithIcon: Story = {
  render: () => (
    <Toggle aria-label="Toggle italic">
      <Italic className="h-4 w-4" />
    </Toggle>
  ),
};

/**
 * Controlled toggle showing pressed state.
 */
export const Controlled: Story = {
  render: () => {
    const [pressed, setPressed] = React.useState(false);

    return (
      <div className="space-y-4">
        <Toggle
          pressed={pressed}
          onPressedChange={setPressed}
          aria-label="Toggle bold">
          <Bold className="h-4 w-4 mr-2" />
          Bold
        </Toggle>
        <p className="text-sm text-muted-foreground">Status: {pressed ? "Pressed" : "Not pressed"}</p>
      </div>
    );
  },
};
