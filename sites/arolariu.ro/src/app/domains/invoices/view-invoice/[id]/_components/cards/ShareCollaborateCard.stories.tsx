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

/** Invoice shared with many users — overflow test. */
export const SharedWithManyUsers: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        sharedWith: Array.from({length: 20}, (_, i) => `user-${String(i).padStart(3, "0")}`),
      }}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice shared with 20 users to test badge count display and overflow handling."}}},
};

/** Invoice shared with single user only. */
export const SharedWithSingleUser: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: ["user-single-001"]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice shared with exactly one user - displays 'Shared' badge with count of 1."}}},
};

/** Important invoice that is private. */
export const ImportantAndPrivate: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, isImportant: true, sharedWith: []}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Important invoice that remains private — combination of importance and privacy."}}},
};

/** Invoice shared with exactly two users. */
export const SharedWithTwoUsers: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, sharedWith: ["user-001", "user-002"]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice shared with exactly two users — minimal plural state."}}},
};

/** Soft-deleted invoice that is public. */
export const SoftDeletedAndPublic: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, isSoftDeleted: true, sharedWith: [LAST_GUID]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Soft-deleted invoice that is still public — tests combined state display."}}},
};
