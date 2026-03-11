import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the `/acknowledgements` page.
 * Displays skeleton placeholders for the header, search/filter controls,
 * tabbed grid/table views of packages, and footer section.
 *
 * This is a "use client" skeleton that uses UI components but no translations.
 */
const meta = {
  title: "Pages/Acknowledgements/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default acknowledgements loading skeleton. */
export const Default: Story = {};

/** Acknowledgements loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
