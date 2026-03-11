import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Route-level loading skeleton for the `/about` hub page.
 * Mirrors the 7-section layout: Hero, Mission, Values, Stats,
 * Navigation, FAQ, and CTA — all rendered as skeleton placeholders.
 */
const meta = {
  title: "Pages/About/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default about page loading skeleton. */
export const Default: Story = {};

/** About page loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
