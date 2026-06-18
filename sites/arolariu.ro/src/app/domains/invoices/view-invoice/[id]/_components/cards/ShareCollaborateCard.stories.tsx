import {WithViewInvoiceContext, invoicePresets, storyInvoice, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {LAST_GUID} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {ShareCollaborateCard} from "./ShareCollaborateCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/ShareCollaborate",
  component: ShareCollaborateCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Share & Collaborate card displaying invoice sharing status with public/private toggle.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Private: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: []}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Private invoice not shared with anyone - shows 'Private' badge."}}},
};

export const SharedWithUsers: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: ["user-uuid-1", "user-uuid-2", "user-uuid-3"]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice shared with 3 specific users - displays 'Shared' badge with count."}}},
};

export const Public: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: [LAST_GUID]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Public invoice accessible to anyone with link - shows 'Public' badge."}}},
};

export const PublicAndShared: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: ["user-uuid-1", "user-uuid-2", LAST_GUID]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice that is both public AND shared with 2 specific users."}}},
};
