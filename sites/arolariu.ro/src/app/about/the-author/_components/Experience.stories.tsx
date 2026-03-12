import type {Meta, StoryObj} from "@storybook/react";
import Experience from "./Experience";

/**
 * Experience timeline displaying the author's professional work history.
 * Features an interactive timeline navigation on the left with detailed
 * experience cards on the right showing responsibilities, achievements,
 * and skills for each role.
 * Uses the `About.Author.Experiences` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Experience",
  component: Experience,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Experience>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default experience timeline with interactive navigation. */
export const Default: Story = {};
