import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice} from "@/app/domains/invoices/_storybook";
import {LAST_GUID} from "@/lib/utils.generic";
import {ShareCollaborateCard} from "./ShareCollaborateCard";

const meta = {
  title: "arolariu.ro/IMS/ViewInvoice/Cards/Invoice/ShareCollaborate",
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
} satisfies Meta<typeof ShareCollaborateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Private: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, sharedWith: []}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Private invoice not shared with anyone - shows 'Private' badge." } } },
};

export const SharedWithUsers: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, sharedWith: ["user-uuid-1", "user-uuid-2", "user-uuid-3"]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Invoice shared with 3 specific users - displays 'Shared' badge with count." } } },
};

export const Public: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, sharedWith: [LAST_GUID]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Public invoice accessible to anyone with link - shows 'Public' badge." } } },
};

export const PublicAndShared: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, sharedWith: ["user-uuid-1", "user-uuid-2", LAST_GUID]}}>
      <ShareCollaborateCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Invoice that is both public AND shared with 2 specific users." } } },
};