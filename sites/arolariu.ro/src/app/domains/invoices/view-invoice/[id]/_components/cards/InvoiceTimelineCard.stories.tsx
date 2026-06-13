import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {invoicePresets, storyInvoice, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {InvoiceTimelineCard} from "./InvoiceTimelineCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * InvoiceTimelineCard displays a chronological timeline of events for an
 * invoice. It takes an `invoice` prop and generates timeline events from it.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/InvoiceTimeline",
  component: InvoiceTimelineCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default timeline with events generated from a mock invoice. */
export const Default: Story = {
  render: ({invoice}) => <InvoiceTimelineCard invoice={invoice} />,
};

/** Timeline for an important invoice with sharing data. */
export const ImportantAndShared: Story = {
  render: ({invoice}) => {
    const invoiceVariant = {
      ...invoice,
      isImportant: true,
      sharedWith: ["user-abc-123", "user-xyz-456"],
    };
    return <InvoiceTimelineCard invoice={invoiceVariant} />;
  },
};

/** Timeline for an invoice that has been edited many times. */
export const ManyUpdates: Story = {
  render: ({invoice}) => {
    const invoiceVariant = {
      ...invoice,
      numberOfUpdates: 12,
      lastUpdatedAt: new Date("2026-01-20T16:30:00.000Z"),
    };
    return <InvoiceTimelineCard invoice={invoiceVariant} />;
  },
};
