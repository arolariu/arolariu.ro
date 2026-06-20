import type {Meta, StoryObj} from "@storybook/react";
import Features from "./Features";

/**
 * Features section displaying the platform's main capabilities.
 * Renders nine interactive feature cards with hover effects, tag badges,
 * and a detail modal for expanded descriptions.
 * Uses the `sections.about.platform.features` i18n namespace.
 */
const meta = {
  title: "arolariu.ro/Pages/About/ThePlatform/Features",
  component: Features,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Features>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default features grid with nine capability cards. */
export const Default: Story = {};
