import type {Meta, StoryObj} from "@storybook/react";
import SharingCard from "./SharingCard";
import {storyInvoice, storyPublicInvoice, WithInvoiceDialogs, installStorybookBrowserMocks} from "../../../_storybook";

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access. Depends on `useDialog`, `useUserInformation`,
 * and `patchInvoice` server action.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs` with browser mocks.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/SharingCard",
  component: SharingCard,
  parameters: {
    layout: "centered",
  },
  beforeEach: () => {
    installStorybookBrowserMocks();
  },
} satisfies Meta<typeof SharingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Private invoice — no shared users. */
export const PrivateInvoice: Story = {
  render: () => (
    <WithInvoiceDialogs>
      <SharingCard invoice={storyInvoice} />
    </WithInvoiceDialogs>
  ),
};

/** Invoice shared with multiple users. */
export const SharedWithUsers: Story = {
  render: () => (
    <WithInvoiceDialogs>
      <SharingCard
        invoice={{
          ...storyInvoice,
          sharedWith: ["user-abc-123", "user-def-456", "user-ghi-789"],
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Public invoice accessible to anyone with the link. */
export const PublicInvoice: Story = {
  render: () => (
    <WithInvoiceDialogs>
      <SharingCard invoice={storyPublicInvoice} />
    </WithInvoiceDialogs>
  ),
};
