import {generateRandomMerchant} from "@/data/mocks";
import type {Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import MerchantReceiptsDialog from "./MerchantReceiptsDialog";

/**
 * MerchantReceiptsDialog displays all receipts from a specific merchant with
 * search, date, and sort filtering.
 *
 * The dialog reads the `Merchant` payload from `DialogContext` rather than
 * props, so this story opens the `EDIT_INVOICE__MERCHANT_INVOICES` dialog on
 * mount via a small harness component that shares the same `DialogProvider`.
 * Receipts are currently mocked internally by the component (a 3-second
 * timeout resolving to an empty list per its `TODO`), so every story
 * renders the same "no receipts found yet" table state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantReceiptsDialog",
  component: MerchantReceiptsDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantReceiptsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMerchant: Merchant = generateRandomMerchant();

/** Opens `EDIT_INVOICE__MERCHANT_INVOICES` on mount so the dialog renders already visible. */
function MerchantReceiptsDialogOpener({merchant}: Readonly<{merchant: Merchant}>): null {
  const {open} = useDialog("EDIT_INVOICE__MERCHANT_INVOICES", "view", merchant);

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Default receipts dialog for a merchant. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <MerchantReceiptsDialogOpener merchant={mockMerchant} />
        <Story />
      </DialogProvider>
    ),
  ],
};
