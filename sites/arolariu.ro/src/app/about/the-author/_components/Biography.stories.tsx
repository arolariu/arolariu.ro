import type {Meta, StoryObj} from "@storybook/react";
import Biography from "./Biography";

/**
 * Biography section with animated content blocks describing the author.
 * Features five bio points, each with a colored icon, animated gradient
 * background orbs, and staggered entrance animations.
 * Uses the `About.Author.Biography` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Biography",
  component: Biography,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Biography>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default biography section with five animated bio points. */
export const Default: Story = {};

/** Biography section on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
