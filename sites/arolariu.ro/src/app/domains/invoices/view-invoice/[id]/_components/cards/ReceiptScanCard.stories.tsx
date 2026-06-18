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
    const firstScan = storyInvoice.scans[0];
    const multiScanInvoice: typeof storyInvoice = {
      ...storyInvoice,
      scans: firstScan
        ? Array.from({length: 5}, (_, i) => ({
            ...firstScan,
            metadata: {
              ...firstScan.metadata,
              scanId: `scan-${String(i).padStart(3, "0")}`,
            },
          }))
        : [],
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
    const firstScan = storyInvoice.scans[0];
    const pdfScan = storyOnlineInvoice.scans[0];
    const scans = firstScan && pdfScan ? [firstScan, pdfScan, firstScan] : [];
    const mixedScanInvoice: typeof storyInvoice = {
      ...storyInvoice,
      scans,
    };
    return (
      <WithViewInvoiceContext invoice={mixedScanInvoice}>
        <ReceiptScanCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Invoice with many scans — 8 scans. */
export const ManyScans: Story = {
  render: () => {
    const firstScan = storyInvoice.scans[0];
    const manyScansInvoice: typeof storyInvoice = {
      ...storyInvoice,
      scans: firstScan
        ? Array.from({length: 8}, (_, i) => ({
            ...firstScan,
            metadata: {
              ...firstScan.metadata,
              scanId: `scan-${String(i).padStart(3, "0")}`,
            },
          }))
        : [],
    };
    return (
      <WithViewInvoiceContext invoice={manyScansInvoice}>
        <ReceiptScanCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with 8 scans to verify carousel scrolling and navigation.",
      },
    },
  },
};

/** Invoice with exactly two scans. */
export const TwoScans: Story = {
  render: () => {
    const firstScan = storyInvoice.scans[0];
    const twoScansInvoice: typeof storyInvoice = {
      ...storyInvoice,
      scans: firstScan ? [firstScan, {...firstScan, metadata: {...firstScan.metadata, scanId: "scan-002"}}] : [],
    };
    return (
      <WithViewInvoiceContext invoice={twoScansInvoice}>
        <ReceiptScanCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with exactly two scans — minimal carousel navigation state.",
      },
    },
  },
};
