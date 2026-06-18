import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  installStorybookBrowserMocks,
  invoicePresets,
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyInvoice,
  storyPublicInvoice,
  withEntityPreset,
} from "../_storybook";
import ShareInvoiceDialog from "./ShareInvoiceDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * ShareInvoiceDialog provides privacy-aware invoice sharing with public link
 * generation, QR codes, and private email invitations.
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
 * `SHARED__INVOICE_SHARE` dialog context and browser mocks for clipboard APIs.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/ShareInvoice",
  component: ShareInvoiceDialog,
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

/** Selection mode for private invoice — user chooses between public or private sharing. */
export const Selection: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_SHARE'
      mode='share'
      payload={{invoice: {...invoice, sharedWith: []}}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};

/**
 * Public flow — private invoice opened in share dialog.
 * User can click public option to enter public sharing mode.
 */
export const PublicFlow: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_SHARE'
      mode='share'
      payload={{invoice: {...invoice, sharedWith: []}}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Invoice already public — displays current public link with QR code and revoke option. */
export const AlreadyPublic: Story = {
  args: {invoicePreset: "public", invoice: storyPublicInvoice},
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_SHARE'
      mode='share'
      payload={{invoice}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Private invoice with existing shared access (non-public sharing). */
export const PrivateWithShares: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_SHARE'
      mode='share'
      payload={{invoice: {...invoice, sharedWith: ["user1@example.com", "user2@example.com"]}}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Share dialog for an empty invoice with no items. */
export const EmptyInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_SHARE'
      mode='share'
      payload={{invoice: storyEmptyInvoice}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};
