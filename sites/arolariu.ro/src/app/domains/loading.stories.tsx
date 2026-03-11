import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the domains overview page, showing header with
 * progress bar, title, subtitle, and service cards grid placeholders.
 */
const meta = {
  title: "Domains/DomainsLoading",
  component: Loading,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the domains overview page. */
export const Default: Story = {};

/** Domains loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
