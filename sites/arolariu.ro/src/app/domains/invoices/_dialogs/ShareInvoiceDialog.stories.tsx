import type {Meta, StoryObj} from "@storybook/react";
import ShareInvoiceDialog from "./ShareInvoiceDialog";
import {OpenDialogOnMount, storyInvoice, storyPublicInvoice, installStorybookBrowserMocks} from "../_storybook";

// @ts-ignore - Mock useUser for Storybook
if (typeof window !== 'undefined') {
  const mockUseUser = () => ({
    user: {
      id: "user_mock_story_id",
      primaryEmailAddress: {emailAddress: "story@example.com"},
      firstName: "Story",
      lastName: "User",
    },
    isLoaded: true,
    isSignedIn: true,
  });

  // Try to mock Clerk if available
  try {
    const clerk = require("@clerk/nextjs");
    if (clerk && !clerk.__MOCKED__) {
      clerk.useUser = mockUseUser;
      clerk.__MOCKED__ = true;
    }
  } catch (e) {
    // Clerk not loaded yet, that's ok
  }
}

/**
 * ShareInvoiceDialog provides privacy-aware invoice sharing with public link
 * generation, QR codes, and private email invitations.
 *
 * This story mounts the real component wrapped in `OpenDialogOnMount` with
 * `SHARED__INVOICE_SHARE` dialog context and browser mocks for clipboard APIs.
 * 
 * **Note:** This story includes a mock Clerk provider to avoid authentication errors in Storybook.
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
      mode="share"
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
      mode="share"
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
      mode="share"
      payload={{invoice: storyPublicInvoice}}>
      <ShareInvoiceDialog />
    </OpenDialogOnMount>
  ),
};
