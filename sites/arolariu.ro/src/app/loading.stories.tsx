import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * The root-level loading skeleton displayed by Next.js while the homepage
 * streams its content. It mirrors the homepage layout with skeleton
 * placeholders for the hero section and technology cards grid.
 *
 * This is a pure visual component with no translations or interactivity.
 */
const meta = {
  title: "App/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton state. */
export const Default: Story = {};

/** Loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
