import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../messages/en.json";
import FeaturesSection from "./FeaturesSection";

/**
 * Features section of the invoices homepage.
 * Displays three feature items (OCR, Analytics, Batch) alongside an
 * invoice illustration. Shows a sign-in prompt for unauthenticated users.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/FeaturesSection",
  component: FeaturesSection,
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
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Authenticated state — no sign-in prompt shown. */
export const Authenticated: Story = {
  args: {
    isAuthenticated: true,
  },
};

/** Unauthenticated state — shows a sign-in prompt below the features. */
export const Unauthenticated: Story = {
  args: {
    isAuthenticated: false,
  },
};
