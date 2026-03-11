import type {Meta, StoryObj} from "@storybook/react";
import CallToAction from "./CallToAction";

/**
 * Call-to-action section for the Platform page footer.
 * Features animated background beams, gradient orbs, primary/secondary CTAs,
 * secondary links (GitHub, Author, Contact), and trust indicator cards.
 * Uses the `About.Platform.callToAction` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/CallToAction",
  component: CallToAction,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CallToAction>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default CTA section with action buttons and trust indicators. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
