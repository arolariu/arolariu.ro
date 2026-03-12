import type {Meta, StoryObj} from "@storybook/react";
import EulaShimmer from "./EULA.shimmers";

/**
 * The EULA shimmer skeleton is displayed while the EULA cookie state is
 * being resolved. It provides placeholder shapes that match the full EULA
 * card layout (shield icon, title, policy cards, cookie toggles, and
 * accept button).
 *
 * This is a pure visual skeleton with no translations or interactivity.
 */
const meta = {
  title: "Pages/Home/EulaShimmer",
  component: EulaShimmer,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof EulaShimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default EULA skeleton shimmer state. */
export const Default: Story = {};

/** EULA skeleton shimmer in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
