import type {Meta, StoryObj} from "@storybook/react";
import ShareInvoiceDialog from "./ShareInvoiceDialog";
import {OpenDialogOnMount, storyInvoice, storyPublicInvoice, installStorybookBrowserMocks} from "../_storybook";

/**
 * ShareInvoiceDialog provides privacy-aware invoice sharing with public link
 * generation, QR codes, and private email invitations.
 *
 * This story mounts the real component wrapped in `OpenDialogOnMount` with
 * `SHARED__INVOICE_SHARE` dialog context and browser mocks for clipboard APIs.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialog",
  component: ShareInvoiceDialog,
  parameters: {
    layout: "centered",
  },
  beforeEach: () => {
    installStorybookBrowserMocks();
  },
} satisfies Meta<typeof ShareInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Selection mode for private invoice — user chooses between public or private sharing. */
export const Selection: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__INVOICE_SHARE"
      payload={{invoice: {...storyInvoice, sharedWith: []}}}>
      <ShareInvoiceDialog />
    </OpenDialogOnMount>
  ),
};

/**
 * Public flow — private invoice opened in share dialog.
 * User can click public option to enter public sharing mode.
 */
export const PublicFlow: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__INVOICE_SHARE"
      payload={{invoice: {...storyInvoice, sharedWith: []}}}>
      <ShareInvoiceDialog />
    </OpenDialogOnMount>
  ),
};

/** Invoice already public — displays current public link with QR code and revoke option. */
export const AlreadyPublic: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__INVOICE_SHARE"
      payload={{invoice: storyPublicInvoice}}>
      <ShareInvoiceDialog />
    </OpenDialogOnMount>
  ),
};

