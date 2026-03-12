import type {Meta, StoryObj} from "@storybook/react";
import Values from "./Values";

/**
 * Values section displaying six core values that guide development:
 * Engineering, Learning, Community, Privacy, Performance, and Accessibility.
 * Each value is rendered as an animated card with an icon.
 * Uses the `About.Hub.values` i18n namespace.
 */
const meta = {
  title: "Pages/About/Values",
  component: Values,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Values>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default values grid with six core value cards. */
export const Default: Story = {};

/** Values section in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Values grid on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "xs"},
  },
};

/** Values grid at XS viewport. */
export const XsViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "xs"},
  },
};

/** Values grid at MD viewport. */
export const MdViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "md"},
  },
};
