import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  installStorybookBrowserMocks,
  invoicePresets,
  storyInvoice,
  storyPublicInvoice,
  withEntityPreset,
  WithInvoiceDialogs,
} from "../../../_storybook";
import SharingCard from "./SharingCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access. Depends on `useDialog`, `useUserInformation`,
 * and `patchInvoice` server action.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs` with browser mocks.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/SharingCard",
  component: SharingCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
  beforeEach: () => {
    installStorybookBrowserMocks();
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Private invoice — no shared users. */
export const PrivateInvoice: Story = {
  render: ({invoice}) => (
    <WithInvoiceDialogs>
      <SharingCard invoice={invoice} />
    </WithInvoiceDialogs>
  ),
};

/** Invoice shared with multiple users. */
export const SharedWithUsers: Story = {
  render: ({invoice}) => (
    <WithInvoiceDialogs>
      <SharingCard
        invoice={{
          ...invoice,
          sharedWith: ["user-abc-123", "user-def-456", "user-ghi-789"],
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Public invoice accessible to anyone with the link. */
export const PublicInvoice: Story = {
  args: {invoicePreset: "public", invoice: storyPublicInvoice},
  render: ({invoice}) => (
    <WithInvoiceDialogs>
      <SharingCard invoice={invoice} />
    </WithInvoiceDialogs>
  ),
};

/** Invoice shared with many users — overflow test. */
export const SharedWithManyUsers: Story = {
  render: ({invoice}) => (
    <WithInvoiceDialogs>
      <SharingCard
        invoice={{
          ...invoice,
          sharedWith: Array.from({length: 15}, (_, i) => `user-${String(i).padStart(3, "0")}`),
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Invoice shared with one user only. */
export const SharedWithSingleUser: Story = {
  render: ({invoice}) => (
    <WithInvoiceDialogs>
      <SharingCard
        invoice={{
          ...invoice,
          sharedWith: ["user-single-001"],
        }}
      />
    </WithInvoiceDialogs>
  ),
};
