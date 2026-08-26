import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceScanType, type Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {ReceiptScanCard} from "./ReceiptScanCard";

/**
 * ReceiptScanCard shows receipt images with navigation, zoom dialog, and
 * previous/next controls. Reads the invoice's scans via `useInvoiceContext`,
 * so every story mounts the real component inside the real
 * `InvoiceContextProvider` re-exported from `.storybook/providers`.
 */
function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={null}>
      <Story />
    </InvoiceContextProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/Cards/ReceiptScan",
  component: ReceiptScanCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ReceiptScanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single scan card — no previous/next navigation controls. */
export const SingleScan: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withScans([{type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/receiptscan/340/500", metadata: {}}])
        .build(),
    ),
  ],
};

/** Multiple scans with previous/next navigation. */
export const MultipleScans: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withScans([
          {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/receiptscan2/340/500", metadata: {}},
          {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/receiptscan3/340/500", metadata: {}},
          {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/receiptscan4/340/500", metadata: {}},
        ])
        .build(),
    ),
  ],
};
