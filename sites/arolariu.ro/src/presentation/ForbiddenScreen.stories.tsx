import ForbiddenScreen from "@/presentation/ForbiddenScreen";
import type {Meta, StoryObj} from "@storybook/react";

const meta: Meta<typeof ForbiddenScreen> = {
  title: "Website/Presentation/ForbiddenScreen",
  component: ForbiddenScreen,
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story for the ForbiddenScreen
export const Default: Story = {
  // As ForbiddenScreen does not take props, args is empty.
  args: {},
};
