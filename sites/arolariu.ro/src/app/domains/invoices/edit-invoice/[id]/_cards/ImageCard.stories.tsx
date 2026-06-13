import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {
  invoicePresets,
  storyImageScanUrl,
  storyInvoice,
  storyInvoiceImageScan,
  storyInvoicePdfScan,
  WithInvoiceDialogs,
  withEntityPreset,
} from "@/app/domains/invoices/_storybook";
import ImageCard from "./ImageCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const invoiceWithPdfScan = {
  ...storyInvoice,
  id: "invoice-story-pdf-scan",
  name: "Invoice with a PDF scan",
  scans: [storyInvoicePdfScan],
};

const invoiceWithoutScans = {
  ...storyInvoice,
  id: "invoice-story-without-scans",
  name: "Invoice without scans",
  scans: [],
};

const invoiceWithMultipleScans = {
  ...storyInvoice,
  id: "invoice-story-multiple-scans",
  name: "Invoice with multiple scans",
  scans: [
    storyInvoiceImageScan,
    {
      ...storyInvoiceImageScan,
      location: `${storyImageScanUrl}?variant=second`,
      metadata: {
        ...storyInvoiceImageScan.metadata,
        scanId: "scan-story-image-002",
        uploadedAt: "2024-03-15T11:15:00.000Z",
      },
    },
  ],
};

const meta = {
  title: "arolariu.ro/IMS/Cards/Scan/ImageCard",
  component: ImageCard,
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{width: "min(420px, 100vw)"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Mounts the real receipt image gallery card with DialogContext so zoom, add, and remove actions can dispatch dialog state.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{width: "min(420px, 100vw)"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
    withEntityPreset("invoicePreset", "invoice", invoicePresets),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const SingleScan: Story = {
  parameters: {
    docs: {
      description: {
        story: "Real image card with the primary story invoice scan and add/remove controls wired through DialogContext.",
      },
    },
  },
};

export const MultipleScans: Story = {
  render: () => <ImageCard invoice={invoiceWithMultipleScans} />,
  parameters: {
    docs: {
      description: {
        story: "Real image card with a local invoice fixture containing two image scans to exercise scan gallery navigation.",
      },
    },
  },
};

export const NoScans: Story = {
  render: () => <ImageCard invoice={invoiceWithoutScans} />,
  parameters: {
    docs: {
      description: {
        story: "Fallback state for an invoice without attached scans; the real component displays its placeholder image and add-scan action.",
      },
    },
  },
};

export const PdfScan: Story = {
  render: () => <ImageCard invoice={invoiceWithPdfScan} />,
  parameters: {
    docs: {
      description: {
        story: "Image card with a PDF document scan attached, exercising the PDF preview/thumbnail path instead of a raster image.",
      },
    },
  },
};
