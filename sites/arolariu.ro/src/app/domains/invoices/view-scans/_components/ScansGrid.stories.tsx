import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../_contexts/DialogContext";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, storyCachedPdfScan} from "../../_storybook";
import ScansGrid from "./ScansGrid";

const thirdReadyScan = {
  ...storyCachedImageScan,
  id: "scan-story-third-ready-001",
  name: "Restaurant receipt scan",
  uploadedAt: new Date("2024-03-16T09:15:00.000Z"),
  sizeInBytes: 187520,
  metadata: {
    ...storyCachedImageScan.metadata,
    scanId: "scan-story-third-ready-001",
    uploadedAt: new Date("2024-03-16T09:15:00.000Z"),
  },
  cachedAt: new Date("2024-03-16T09:30:00.000Z"),
  status: "ready",
} as const;

const meta = {
  title: "arolariu.ro/IMS/Components/Scan/ScansGrid",
  component: ScansGrid,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Renders the real scan grid using seeded Zustand scan state and Storybook-safe scan action hooks.",
      },
    },
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div style={{padding: "2rem"}}>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof ScansGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, thirdReadyScan],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Shows real scan cards for multiple ready scans (image, PDF, and additional ready scan).",
      },
    },
  },
};

export const WithSelection: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, thirdReadyScan],
      selectedScans: [storyCachedImageScan, storyCachedPdfScan],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the grid with pre-selected scans so selection UI is visible immediately.",
      },
    },
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the production empty state after the scan store has hydrated.",
      },
    },
  },
};

/** Single scan — minimal data edge case. */
export const SingleScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with a single scan card. Tests sparse layout rendering between empty and full states.",
      },
    },
  },
};

/** Two scans — minimal viable grid. */
export const TwoScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with two scan cards (image and PDF). Verifies layout with minimal viable data set.",
      },
    },
  },
};

/** Many scans (15) — overflow grid test. */
export const ManyScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const manyScans: CachedScan[] = Array.from({length: 15}, (_, i) => ({
      ...storyCachedImageScan,
      id: `scan-story-many-${String(i).padStart(3, "0")}`,
      name: `Scan ${i + 1}`,
      uploadedAt: new Date(Date.now() - i * 3600000),
      metadata: {
        ...storyCachedImageScan.metadata,
        scanId: `scan-story-many-${String(i).padStart(3, "0")}`,
        uploadedAt: new Date(Date.now() - i * 3600000),
      },
    }));
    seedInvoiceStoryStores({
      scans: manyScans,
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with 15 scan cards. Tests grid layout overflow, responsive design, and rendering performance with many items.",
      },
    },
  },
};

/** Mixed scan types (images and PDFs). */
export const MixedScanTypes: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const mixedScans: CachedScan[] = [
      storyCachedImageScan,
      storyCachedPdfScan,
      {...storyCachedImageScan, id: "scan-story-img-2", name: "Grocery receipt 2"},
      {...storyCachedPdfScan, id: "scan-story-pdf-2", name: "Restaurant invoice"},
      {...storyCachedImageScan, id: "scan-story-img-3", name: "Pharmacy receipt"},
    ];
    seedInvoiceStoryStores({
      scans: mixedScans,
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Grid with mixed scan types (images and PDFs). Tests rendering of different scan formats in the same grid.",
      },
    },
  },
};
