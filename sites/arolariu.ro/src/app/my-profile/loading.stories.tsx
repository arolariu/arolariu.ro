import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the my-profile page, showing the bento grid header
 * with profile card, stats summary, sidebar navigation, content panel,
 * and bottom mobile navigation placeholders.
 */
const meta = {
  title: "Pages/Profile/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the my-profile page. */
export const Default: Story = {};

/** My-profile loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
