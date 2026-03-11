import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Route-level loading skeleton for the `/about/the-platform` page.
 * Mirrors the full platform page layout with skeleton placeholders for
 * Hero, Features, Architecture, TechStack (with stats), Timeline, and CTA.
 */
const meta = {
  title: "Pages/About/ThePlatform/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default platform page loading skeleton. */
export const Default: Story = {};

/** Platform page loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
