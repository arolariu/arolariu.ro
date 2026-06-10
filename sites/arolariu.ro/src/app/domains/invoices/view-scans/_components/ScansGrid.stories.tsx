import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../_contexts/DialogContext";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, storyCachedImageScan, storyCachedPdfScan} from "../../_storybook";
import ScansGrid from "./ScansGrid";

const linkedScan = {
  ...storyCachedImageScan,
  id: "scan-story-linked-001",
  name: "Linked receipt scan",
  metadata: {
    ...storyCachedImageScan.metadata,
    status: "attached",
    attachedTo: "invoice-story-001",
  },
  status: "ready",
} as const;

const meta = {
  title: "Invoices/ViewScans/ScansGrid",
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
      scans: [storyCachedImageScan, storyCachedPdfScan, linkedScan],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Shows real scan cards for image, PDF, and attached scans.",
      },
    },
  },
};

export const WithSelection: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, linkedScan],
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
