import type {Meta, StoryObj} from "@storybook/react";
import FeaturesSection from "./Features";

/**
 * The Features section showcases the platform's key technology highlights.
 *
 * It renders a typewriter-animated heading, a description, and a grid of
 * six feature cards (Next.js, Azure, C#, Svelte, OpenTelemetry, GitHub
 * Actions) — each with an icon, title, and description. A "learn more"
 * link directs users to `/about`.
 */
const meta = {
  title: "Homepage/Features",
  component: FeaturesSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default features grid with six technology cards. */
export const Default: Story = {};

/** Features grid at mobile viewport width — single-column layout. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Features grid in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Features grid at tablet (iPad) viewport width. */
export const TabletViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "ipad"},
  },
};
