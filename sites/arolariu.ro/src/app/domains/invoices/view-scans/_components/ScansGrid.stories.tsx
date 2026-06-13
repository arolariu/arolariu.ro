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
  title: "arolariu.ro/IMS/ViewScans/Components/ScansGrid",
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
