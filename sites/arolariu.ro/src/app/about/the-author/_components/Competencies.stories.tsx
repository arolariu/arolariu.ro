import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Competencies from "./Competencies";

/**
 * Competencies section displaying the author's professional skill set.
 * Renders six animated skill cards with icons, titles, and descriptions.
 * Uses the `About.Author.Competencies` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Competencies",
  component: Competencies,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Competencies>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default competencies grid with six skill cards. */
export const Default: Story = {};
