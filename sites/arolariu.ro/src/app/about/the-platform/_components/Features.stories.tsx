import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Features from "./Features";

/**
 * Features section displaying the platform's main capabilities.
 * Renders nine interactive feature cards with hover effects, tag badges,
 * and a detail modal for expanded descriptions.
 * Uses the `About.Platform.features` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/Features",
  component: Features,
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
} satisfies Meta<typeof Features>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default features grid with nine capability cards. */
export const Default: Story = {};
