import type {Meta, StoryObj} from "@storybook/react";
import Hero from "./Hero";

/**
 * Hero section for the Platform page.
 * Features a full-height hero with animated background beams, gradient text
 * (GradientText component), floating elements, scroll-based parallax effects,
 * feature pills, and CTA buttons.
 * Uses the `About.Platform.hero` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/Hero",
  component: Hero,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default platform hero with animated background and CTA buttons. */
export const Default: Story = {};
