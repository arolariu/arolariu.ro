import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import LoadingInvoice from "./LoadingInvoice";

/**
 * LoadingInvoice displays a loading state while a single invoice is being
 * fetched. It shows a title and a description that includes the invoice
 * identifier being loaded.
 */
const meta = {
  title: "Invoices/LoadingInvoice",
  component: LoadingInvoice,
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
} satisfies Meta<typeof LoadingInvoice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading state with a sample invoice identifier. */
export const Default: Story = {
  args: {
    invoiceIdentifier: "INV-2025-001",
  },
};

/** Loading state with a UUID-style identifier. */
export const WithUuidIdentifier: Story = {
  args: {
    invoiceIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
};

/** Loading state in dark mode. */
export const DarkMode: Story = {
  args: {
    invoiceIdentifier: "INV-2025-001",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
