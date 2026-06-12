import type {Meta, StoryObj} from "@storybook/react";
import {storyImageScanUrl, storyInvoice, storyInvoiceImageScan, WithInvoiceDialogs} from "@/app/domains/invoices/_storybook";
import ImageCard from "./ImageCard";

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
  title: "Invoices/EditInvoice/Cards/ImageCard",
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
} satisfies Meta<typeof ImageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleScan: Story = {
  args: {
    invoice: storyInvoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Real image card with the primary story invoice scan and add/remove controls wired through DialogContext.",
      },
    },
  },
};

export const MultipleScans: Story = {
  args: {
    invoice: invoiceWithMultipleScans,
  },
  parameters: {
    docs: {
      description: {
        story: "Real image card with a local invoice fixture containing two image scans to exercise scan gallery navigation.",
      },
    },
  },
};

export const NoScans: Story = {
  args: {
    invoice: invoiceWithoutScans,
  },
  parameters: {
    docs: {
      description: {
        story: "Fallback state for an invoice without attached scans; the real component displays its placeholder image and add-scan action.",
      },
    },
  },
};
