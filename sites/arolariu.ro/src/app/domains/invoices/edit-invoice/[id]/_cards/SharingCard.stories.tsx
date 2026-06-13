import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import SharingCard from "./SharingCard";
import {
  installStorybookBrowserMocks,
  invoicePresets,
  storyInvoice,
  storyPublicInvoice,
  WithInvoiceDialogs,
  withEntityPreset,
} from "../../../_storybook";

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
