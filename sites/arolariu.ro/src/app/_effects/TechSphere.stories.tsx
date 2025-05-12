/** @format */

import TechSphere from "@/app/_effects/TechSphere";
import type {Meta, StoryObj} from "@storybook/react";

const meta: Meta<typeof TechSphere> = {
  title: "Website/Effects/TechSphere",
  component: TechSphere,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story for the TechSphere component
export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{width: "100vw", height: "100vh"}}>
        <Story />
      </div>
    ),
  ],
};

// Story showing the TechSphere in a smaller container
export const SmallContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{width: "300px", height: "300px"}}>
        <Story />
      </div>
    ),
  ],
};
