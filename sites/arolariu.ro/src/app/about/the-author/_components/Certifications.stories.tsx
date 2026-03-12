import type {Meta, StoryObj} from "@storybook/react";
import Certifications from "./Certifications";

/**
 * Certifications section showcasing professional certifications.
 * Displays interactive cards with certification details, core skills,
 * and external links. Currently shows AZ-900 and AI-900 certifications.
 * Uses the `About.Author.Certifications` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Certifications",
  component: Certifications,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Certifications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default certifications section with Azure certification cards. */
export const Default: Story = {};
