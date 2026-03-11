import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Education from "./Education";

/**
 * Education section displaying the author's educational background.
 * Features interactive flip cards for each university with front/back
 * views, course lists, and program details.
 * Uses the `About.Author.Education` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Education",
  component: Education,
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
} satisfies Meta<typeof Education>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default education section with interactive university cards. */
export const Default: Story = {};
