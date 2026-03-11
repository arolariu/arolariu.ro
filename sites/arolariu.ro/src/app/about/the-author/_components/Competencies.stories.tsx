import type {Meta, StoryObj} from "@storybook/react";
import Competencies from "./Competencies";

/**
 * Competencies section displaying the author's professional skill set.
 * Renders six animated skill cards with icons, titles, and descriptions.
 * Uses the `About.Author.Competencies` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Competencies",
  component: Competencies,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Competencies>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default competencies grid with six skill cards. */
export const Default: Story = {};

/** Competencies section in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Competencies section at mobile viewport width. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
