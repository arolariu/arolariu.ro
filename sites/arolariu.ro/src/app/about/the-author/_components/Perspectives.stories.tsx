import type {Meta, StoryObj} from "@storybook/react";
import Perspectives from "./Perspectives";

/**
 * Perspectives section displaying testimonials from colleagues and peers.
 * Renders a grid of quote cards, each with an avatar, author name,
 * position, and quote text with staggered entrance animations.
 * Uses the `About.Author.Perspectives` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Perspectives",
  component: Perspectives,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Perspectives>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default perspectives grid with nine testimonial cards. */
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
