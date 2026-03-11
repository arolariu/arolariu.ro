import type {Meta, StoryObj} from "@storybook/react";
import {ProfileSkeleton} from "./ProfileSkeleton";

/**
 * The ProfileSkeleton is displayed while the user profile data is loading.
 * It renders placeholders for the profile header (avatar, name, badges,
 * progress bar), sidebar navigation pills, and content area cards.
 *
 * This is a pure visual skeleton with no translations or interactivity.
 */
const meta = {
  title: "Pages/Profile/ProfileSkeleton",
  component: ProfileSkeleton,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProfileSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default profile loading skeleton. */
export const Default: Story = {};

/** Profile skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
