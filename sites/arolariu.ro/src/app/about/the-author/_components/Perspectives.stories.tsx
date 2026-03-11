import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Perspectives from "./Perspectives";

/**
 * Perspectives section displaying testimonials from colleagues and peers.
 * Renders a grid of quote cards, each with an avatar, author name,
 * position, and quote text with staggered entrance animations.
 * Uses the `About.Author.Perspectives` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Perspectives",
  component: Perspectives,
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
} satisfies Meta<typeof Perspectives>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default perspectives grid with nine testimonial cards. */
export const Default: Story = {};
