import {generateRandomInvoice} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../messages/en.json";
import {InvoiceTimelineCard} from "./InvoiceTimelineCard";

/**
 * InvoiceTimelineCard displays a chronological timeline of events for an
 * invoice. It takes an `invoice` prop and generates timeline events from it.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceTimelineCard",
  component: InvoiceTimelineCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-lg">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceTimelineCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoice = generateRandomInvoice();

/** Default timeline with events generated from a mock invoice. */
export const Default: Story = {
  args: {
    invoice: mockInvoice,
  },
};

/** Timeline for an important invoice with sharing data. */
export const ImportantAndShared: Story = {
  args: {
    invoice: {
      ...mockInvoice,
      isImportant: true,
      sharedWith: ["user-abc-123", "user-xyz-456"],
    },
  },
};
