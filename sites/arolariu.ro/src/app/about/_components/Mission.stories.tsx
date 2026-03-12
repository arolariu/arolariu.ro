import type {Meta, StoryObj} from "@storybook/react";
import Mission from "./Mission";

/**
 * Mission section displaying the platform's purpose and core pillars.
 * Renders three pillar cards (Innovation, Quality, Openness) with
 * animated entrance effects. Uses the `About.Hub.mission` i18n namespace.
 */
const meta = {
  title: "Pages/About/Mission",
  component: Mission,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Mission>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default mission section with three core pillars. */
export const Default: Story = {};
