import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Route-level loading skeleton for the `/about/the-author` page.
 * Mirrors the full author page layout with skeleton placeholders for
 * Hero, Biography, Competencies, Experience, Education, Certifications,
 * Perspectives, and Contact sections.
 */
const meta = {
  title: "Pages/About/TheAuthor/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default author page loading skeleton. */
export const Default: Story = {};
