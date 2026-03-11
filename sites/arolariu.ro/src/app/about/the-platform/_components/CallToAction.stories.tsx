import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import CallToAction from "./CallToAction";

/**
 * Call-to-action section for the Platform page footer.
 * Features animated background beams, gradient orbs, primary/secondary CTAs,
 * secondary links (GitHub, Author, Contact), and trust indicator cards.
 * Uses the `About.Platform.callToAction` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/CallToAction",
  component: CallToAction,
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
} satisfies Meta<typeof CallToAction>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default CTA section with action buttons and trust indicators. */
export const Default: Story = {};
