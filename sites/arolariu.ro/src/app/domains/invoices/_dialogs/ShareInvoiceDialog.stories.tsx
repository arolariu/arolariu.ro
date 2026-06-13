import type {Meta, StoryObj} from "@storybook/react";
import ShareInvoiceDialog from "./ShareInvoiceDialog";
import {OpenDialogButton, playOpenDialog, storyInvoice, storyPublicInvoice, installStorybookBrowserMocks} from "../_storybook";

/**
 * ShareInvoiceDialog provides privacy-aware invoice sharing with public link
 * generation, QR codes, and private email invitations.
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
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
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__INVOICE_SHARE"
      mode="share"
      payload={{invoice: {...storyInvoice, sharedWith: []}}}>
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
  render: () => (
    <OpenDialogButton
      dialog="SHARED__INVOICE_SHARE"
      mode="share"
      payload={{invoice: {...storyInvoice, sharedWith: []}}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};

/** Invoice already public — displays current public link with QR code and revoke option. */
export const AlreadyPublic: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog="SHARED__INVOICE_SHARE"
      mode="share"
      payload={{invoice: storyPublicInvoice}}>
      <ShareInvoiceDialog />
    </OpenDialogButton>
  ),
};
