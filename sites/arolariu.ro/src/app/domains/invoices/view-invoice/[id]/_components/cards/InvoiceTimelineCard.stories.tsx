import {generateRandomInvoice} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceTimelineCard} from "./InvoiceTimelineCard";

/**
 * InvoiceTimelineCard displays a chronological timeline of events for an
 * invoice. It takes an `invoice` prop and generates timeline events from it.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/InvoiceTimeline",
  component: InvoiceTimelineCard,
  decorators: [
    (Story) => (
      <div className='max-w-lg'>
        <Story />
      </div>
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

/** Invoice timeline card in dark mode. */
export const DarkMode: Story = {
  args: {
    invoice: mockInvoice,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Invoice timeline card at mobile viewport width. */
export const MobileViewport: Story = {
  args: {
    invoice: mockInvoice,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
