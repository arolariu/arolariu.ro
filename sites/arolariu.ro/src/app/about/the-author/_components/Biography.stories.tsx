import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
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
} satisfies Meta<typeof Biography>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default biography section with five animated bio points. */
export const Default: Story = {};
