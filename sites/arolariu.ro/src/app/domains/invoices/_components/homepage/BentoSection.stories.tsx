import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../messages/en.json";
import BentoSection from "./BentoSection";

/**
 * Bento grid section displaying platform capabilities:
 * AI, Analytics, Cloud, OCR, Security, and Sharing.
 * Features animated gradient cards with shimmer overlays and particles.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/BentoSection",
  component: BentoSection,
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
} satisfies Meta<typeof BentoSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default bento grid with six capability cards. */
export const Default: Story = {};
