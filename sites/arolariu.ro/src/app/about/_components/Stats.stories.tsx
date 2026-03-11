import type {Meta, StoryObj} from "@storybook/react";
import Stats from "./Stats";

/**
 * Stats section displaying key platform metrics: Years Active, Lines of Code,
 * Technologies, and Test Coverage. Each stat is rendered as an animated card
 * with a gradient icon. Uses the `About.Hub.stats` i18n namespace.
 */
const meta = {
  title: "Pages/About/Stats",
  component: Stats,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Stats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default stats grid with four metric cards. */
export const Default: Story = {};

/** Stats grid in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Stats grid on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
