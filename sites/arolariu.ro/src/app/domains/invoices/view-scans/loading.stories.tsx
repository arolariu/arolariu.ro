import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the view-scans page, showing a header placeholder
 * and a grid of skeleton scan cards.
 */
const meta = {
  title: "Invoices/ViewScans/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the view scans page. */
export const Default: Story = {};

/** View scans loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** View scans loading skeleton at mobile viewport width. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
