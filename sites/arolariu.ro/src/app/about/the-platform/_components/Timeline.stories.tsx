import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Timeline from "./Timeline";

/**
 * Timeline section displaying the platform's development history.
 * Features an interactive alternating timeline with eight milestone events,
 * expandable detail sections, technology tags, and a future indicator.
 * Uses the `About.Platform.timeline` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/Timeline",
  component: Timeline,
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
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default timeline with eight expandable milestone events. */
export const Default: Story = {};
