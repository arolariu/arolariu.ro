import {
  invoicePresets,
  storyImageScanUrl,
  storyInvoice,
  storyInvoiceImageScan,
  storyInvoicePdfScan,
  withEntityPreset,
  WithInvoiceDialogs,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
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
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Mounts the real receipt image gallery card with DialogContext so zoom, add, and remove actions can dispatch dialog state.",
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
        story:
          "Fallback state for an invoice without attached scans; the real component displays its placeholder image and add-scan action.",
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

/** Invoice with 10 scans — exercises gallery overflow and navigation. */
export const ManyScans: Story = {
  render: () => {
    const invoiceWithManyScans = {
      ...storyInvoice,
      id: "invoice-story-many-scans",
      name: "Invoice with many scans",
      scans: Array.from({length: 10}, (_, i) => ({
        ...storyInvoiceImageScan,
        location: `${storyImageScanUrl}?scan=${i}`,
        metadata: {
          ...storyInvoiceImageScan.metadata,
          scanId: `scan-story-image-${String(i).padStart(3, "0")}`,
          uploadedAt: new Date(2024, 2, 15, 10, i).toISOString(),
        },
      })),
    };
    return <ImageCard invoice={invoiceWithManyScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with 10 scans to verify carousel navigation, pagination, and thumbnail overflow behavior.",
      },
    },
  },
};

/** Invoice with mixed image and PDF scans. */
export const MixedMediaTypes: Story = {
  render: () => {
    const invoiceWithMixedScans = {
      ...storyInvoice,
      id: "invoice-story-mixed-scans",
      name: "Invoice with mixed media types",
      scans: [storyInvoiceImageScan, storyInvoicePdfScan, {...storyInvoiceImageScan, location: `${storyImageScanUrl}?variant=second`}],
    };
    return <ImageCard invoice={invoiceWithMixedScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with a mix of image and PDF scans to verify media type switching and preview rendering.",
      },
    },
  },
};

/** Invoice with single scan only. */
export const SingleImage: Story = {
  render: () => {
    const invoiceWithSingleScan = {
      ...storyInvoice,
      id: "invoice-story-single-scan",
      name: "Invoice with single scan",
      scans: [storyInvoiceImageScan],
    };
    return <ImageCard invoice={invoiceWithSingleScan} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with exactly one image scan — minimal carousel state.",
      },
    },
  },
};

/** Invoice with exactly two scans — exercises next/prev navigation. */
export const TwoScans: Story = {
  render: () => {
    const invoiceWithTwoScans = {
      ...storyInvoice,
      id: "invoice-story-two-scans",
      name: "Invoice with two scans",
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
    return <ImageCard invoice={invoiceWithTwoScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with exactly two scans to exercise basic carousel navigation.",
      },
    },
  },
};

/** Invoice with three scans. */
export const ThreeScans: Story = {
  render: () => {
    const invoiceWithThreeScans = {
      ...storyInvoice,
      id: "invoice-story-three-scans",
      name: "Invoice with three scans",
      scans: Array.from({length: 3}, (_, i) => ({
        ...storyInvoiceImageScan,
        location: `${storyImageScanUrl}?scan=${i}`,
        metadata: {
          ...storyInvoiceImageScan.metadata,
          scanId: `scan-story-image-${String(i).padStart(3, "0")}`,
          uploadedAt: new Date(2024, 2, 15, 10, i).toISOString(),
        },
      })),
    };
    return <ImageCard invoice={invoiceWithThreeScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with three scans to verify carousel mid-range navigation.",
      },
    },
  },
};

/** Invoice with five scans. */
export const FiveScans: Story = {
  render: () => {
    const invoiceWithFiveScans = {
      ...storyInvoice,
      id: "invoice-story-five-scans",
      name: "Invoice with five scans",
      scans: Array.from({length: 5}, (_, i) => ({
        ...storyInvoiceImageScan,
        location: `${storyImageScanUrl}?scan=${i}`,
        metadata: {
          ...storyInvoiceImageScan.metadata,
          scanId: `scan-story-image-${String(i).padStart(3, "0")}`,
          uploadedAt: new Date(2024, 2, 15, 10, i).toISOString(),
        },
      })),
    };
    return <ImageCard invoice={invoiceWithFiveScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Image card with five scans to verify carousel with moderate item count.",
      },
    },
  },
};
