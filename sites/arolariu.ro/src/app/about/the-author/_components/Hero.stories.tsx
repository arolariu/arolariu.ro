import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Hero from "./Hero";

/**
 * Dynamic hero section for the author's page.
 * Displays the author's profile image with a parallax scrolling effect,
 * a typewriter-animated gradient title, and a subtitle.
 * Uses the `About.Author` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Hero",
  component: Hero,
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
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default hero with author image, typewriter title, and subtitle. */
export const Default: Story = {};
