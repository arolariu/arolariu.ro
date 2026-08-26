import {generateRandomInvoice} from "@/data/mocks";
import {LAST_GUID} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import SharingCard from "./SharingCard";

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access.
 *
 * Requires `DialogProvider` because it dispatches the `SHARED__INVOICE_SHARE`
 * dialog. `useUserInformation` fetches `/api/user`, which is unavailable in
 * Storybook — the hook gracefully falls back to its guest defaults, matching
 * production behavior when the request fails.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Cards/SharingCard",
  component: SharingCard,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SharingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const privateInvoice: Invoice = {...generateRandomInvoice(), sharedWith: []};

const publicInvoice: Invoice = {
  ...generateRandomInvoice(),
  sharedWith: [LAST_GUID, "user-abc-123"],
};

/** Private invoice — no shared users. */
export const PrivateInvoice: Story = {
  args: {invoice: privateInvoice},
};

/** Public invoice with a shared user. */
export const PublicInvoice: Story = {
  args: {invoice: publicInvoice},
};
