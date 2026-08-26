import {useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Invoice, Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import ShareAnalyticsDialog from "./ShareAnalyticsDialog";

/**
 * ShareAnalyticsDialog renders a tabbed sharing dialog (image / email) with
 * an invoice+merchant payload read from `useDialog("VIEW_INVOICE__SHARE_ANALYTICS")`.
 * The dialog only renders its content while open, so this story opens it
 * programmatically on mount (via the real `useDialogs` hook) inside the real
 * `DialogProvider` re-exported from `.storybook/providers` — the same
 * dispatch mechanism production code uses when a user clicks "Share".
 */
const mockInvoice: Invoice = generateRandomInvoice();
const mockMerchant: Merchant = generateRandomMerchant();

/** Opens the share-analytics dialog with a mock payload on mount, then renders it. */
function OpenedShareAnalyticsDialog(): React.JSX.Element {
  const {openDialog} = useDialogs();

  useEffect(() => {
    openDialog("VIEW_INVOICE__SHARE_ANALYTICS", "share", {invoice: mockInvoice, merchant: mockMerchant});
  }, [openDialog]);

  return <ShareAnalyticsDialog />;
}

const meta = {
  title: "Invoices/ViewInvoice/Dialogs/ShareAnalyticsDialog",
  component: ShareAnalyticsDialog,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ShareAnalyticsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default share-analytics dialog, opened on mount with a mock invoice/merchant payload. */
export const Default: Story = {
  render: () => <OpenedShareAnalyticsDialog />,
};
