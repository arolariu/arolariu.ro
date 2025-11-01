import type {Meta, StoryObj} from "@storybook/react";
import {withInvoiceCreatorContext} from "@/.storybook/decorators";
import type {InvoiceScan} from "../_types/InvoiceScan";
import GridDisplay from "./GridDisplay";

// Mock data for invoice scans
const createMockScan = (id: string, name: string, type: "image" | "pdf", size: number): InvoiceScan => {
  const blob = new Blob([`mock-${type}-data`], {type: type === "pdf" ? "application/pdf" : "image/jpeg"});
  const file = new File([blob], name, {type: blob.type});
  
  return {
    id,
    file,
    blob,
    name,
    type,
    preview: `https://via.placeholder.com/400x600/4F46E5/FFFFFF?text=${encodeURIComponent(name)}`,
    uploadedAt: new Date(Date.now() - Math.random() * 86400000),
    createdAt: new Date(Date.now() - Math.random() * 86400000),
    rotation: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    mimeType: blob.type,
    size,
    isProcessing: false,
  };
};

const mockScans: InvoiceScan[] = [
  createMockScan("1", "invoice-2024-01.jpg", "image", 2.5 * 1024 * 1024),
  createMockScan("2", "receipt-grocery.png", "image", 1.8 * 1024 * 1024),
  createMockScan("3", "bill-utility.pdf", "pdf", 0.5 * 1024 * 1024),
  createMockScan("4", "invoice-2024-02.jpg", "image", 3.2 * 1024 * 1024),
  createMockScan("5", "receipt-restaurant.jpg", "image", 2.1 * 1024 * 1024),
  createMockScan("6", "invoice-2024-03.jpg", "image", 2.8 * 1024 * 1024),
];

const meta: Meta<typeof GridDisplay> = {
  title: "Invoices/CreateInvoice/GridDisplay",
  component: GridDisplay,
  parameters: {
    layout: "padded",
  },
  decorators: [withInvoiceCreatorContext],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default grid view with multiple scans
 */
export const Default: Story = {
  args: {
    scans: mockScans,
  },
};

/**
 * Empty state - no scans uploaded yet
 */
export const Empty: Story = {
  args: {
    scans: [],
  },
};

/**
 * Single scan - should display full screen
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
};

/**
 * Two scans - should display in 50/50 split
 */
export const TwoScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1]],
  },
};

/**
 * Three scans - should display in 3-column grid
 */
export const ThreeScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1], mockScans[2]],
  },
};

/**
 * Six scans - two rows of 3 columns each
 */
export const SixScans: Story = {
  args: {
    scans: mockScans,
  },
};

/**
 * Large dataset to demonstrate pagination
 */
export const LargeDataset: Story = {
  args: {
    scans: Array.from({length: 15}, (_, i) =>
      createMockScan(
        `scan-${i}`,
        `invoice-${String(i + 1).padStart(3, "0")}.jpg`,
        "image",
        Math.random() * 5 * 1024 * 1024,
      ),
    ),
  },
};

/**
 * Mix of image and PDF scans
 */
export const MixedTypes: Story = {
  args: {
    scans: [
      createMockScan("1", "invoice.jpg", "image", 2.5 * 1024 * 1024),
      createMockScan("2", "receipt.pdf", "pdf", 0.5 * 1024 * 1024),
      createMockScan("3", "bill.png", "image", 1.8 * 1024 * 1024),
    ],
  },
};
