import {storyInvoice, storyOnlineInvoice, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {ReceiptScanCard} from "./ReceiptScanCard";

/**
 * ReceiptScanCard renders the invoice's scan carousel with zoom/rotate controls
 * from `useInvoiceContext`. Mounts the real component inside the view-invoice context.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Scan/ReceiptScan",
  component: ReceiptScanCard,
  parameters: {layout: "centered"},
} satisfies Meta<typeof ReceiptScanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single-scan invoice. */
export const SingleScan: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ReceiptScanCard />
    </WithViewInvoiceContext>
  ),
};

/** Invoice with no scans — falls back to the placeholder image. */
export const NoScans: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, scans: []}}>
      <ReceiptScanCard />
    </WithViewInvoiceContext>
  ),
};

/** Invoice whose scans include a PDF scan. */
export const PdfScan: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyOnlineInvoice}>
      <ReceiptScanCard />
    </WithViewInvoiceContext>
  ),
};

/** Invoice with multiple image scans — carousel navigation. */
export const MultipleImageScans: Story = {
  render: () => {
    const multiScanInvoice = {
      ...storyInvoice,
      scans: Array.from({length: 5}, (_, i) => ({
        ...storyInvoice.scans[0],
        metadata: {
          ...storyInvoice.scans[0].metadata,
          scanId: `scan-${String(i).padStart(3, "0")}`,
        },
      })),
    };
    return (
      <WithViewInvoiceContext invoice={multiScanInvoice}>
        <ReceiptScanCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Invoice with mixed image and PDF scans. */
export const MixedMediaTypes: Story = {
  render: () => {
    const mixedScanInvoice = {
      ...storyInvoice,
      scans: [storyInvoice.scans[0], storyOnlineInvoice.scans[0], storyInvoice.scans[0]],
    };
    return (
      <WithViewInvoiceContext invoice={mixedScanInvoice}>
        <ReceiptScanCard />
      </WithViewInvoiceContext>
    );
  },
};
