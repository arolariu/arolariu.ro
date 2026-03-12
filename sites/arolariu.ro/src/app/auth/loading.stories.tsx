import type {Meta, StoryObj} from "@storybook/react";
import Loading from "../loading";

/**
 * Loading skeleton for authentication pages. Shows a structured placeholder
 * with hero header, trust badges, auth cards, and footer skeletons.
 */
const meta = {
  title: "Pages/Auth/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the auth page. */
export const Default: Story = {};

/** Auth page loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
