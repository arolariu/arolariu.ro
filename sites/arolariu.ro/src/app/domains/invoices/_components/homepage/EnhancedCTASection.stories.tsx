import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../messages/en.json";
import EnhancedCTASection from "./EnhancedCTASection";

/**
 * Enhanced call-to-action section for the invoices homepage.
 * Features animated gradient orbs, sparkle icon, CTA buttons,
 * and trust badges (Secure, Cloud, AI).
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/EnhancedCTASection",
  component: EnhancedCTASection,
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
} satisfies Meta<typeof EnhancedCTASection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default CTA section with action buttons and trust badges. */
export const Default: Story = {};
