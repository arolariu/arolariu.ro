import {generateRandomMerchant} from "@/data/mocks";
import type {Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import MerchantDialog from "./MerchantDialog";

/**
 * MerchantDialog renders detailed merchant information (name, category,
 * address, phone).
 *
 * The dialog reads the `Merchant` payload from `DialogContext` rather than
 * props (and renders `null` while the payload is empty), so this story
 * opens the `EDIT_INVOICE__MERCHANT` dialog on mount via a small harness
 * component that shares the same `DialogProvider`.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantDialog",
  component: MerchantDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMerchant: Merchant = generateRandomMerchant();

/** Opens `EDIT_INVOICE__MERCHANT` on mount so the dialog renders already visible. */
function MerchantDialogOpener({merchant}: Readonly<{merchant: Merchant}>): null {
  const {open} = useDialog("EDIT_INVOICE__MERCHANT", "view", merchant);

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Default merchant details dialog. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <MerchantDialogOpener merchant={mockMerchant} />
        <Story />
      </DialogProvider>
    ),
  ],
};
