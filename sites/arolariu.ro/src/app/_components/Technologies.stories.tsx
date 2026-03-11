import type {Meta, StoryObj} from "@storybook/react";
import TechnologiesSection from "./Technologies";

/**
 * The Technologies section highlights the platform's modern architecture.
 *
 * It renders a badge, heading, descriptive paragraph, a check-list of key
 * architectural points, a "learn more" button, and a decorative code block
 * showing the `architecture.tsx` snippet. Animated via `motion/react` with
 * viewport-triggered entrance transitions.
 */
const meta = {
  title: "Homepage/Technologies",
  component: TechnologiesSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TechnologiesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default technologies section with architecture code block. */
export const Default: Story = {};
