import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Stats from "./Stats";

/**
 * Statistics dashboard for the Acknowledgements page.
 * Shows four metric cards: Total packages, Production dependencies,
 * Development dependencies, and MIT-licensed packages.
 * Uses the `Acknowledgements.stats` i18n namespace.
 */
const meta = {
  title: "Pages/Acknowledgements/Stats",
  component: Stats,
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
} satisfies Meta<typeof Stats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default statistics dashboard with four package metrics. */
export const Default: Story = {};
