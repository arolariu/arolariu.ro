import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceCreatorProvider} from "../_context/InvoiceCreatorContext";
import type {InvoiceScan} from "../_types/InvoiceScan";
import CarouselDisplay from "./CarouselDisplay";

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
    preview: `https://via.placeholder.com/600x800/6366F1/FFFFFF?text=${encodeURIComponent(name)}`,
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
];

// Mock context provider with scans
const MockInvoiceCreatorProvider = ({
  children,
  scans = [],
}: {
  children: React.ReactNode;
  scans?: InvoiceScan[];
}) => {
  return <InvoiceCreatorProvider>{children}</InvoiceCreatorProvider>;
};

const meta: Meta<typeof CarouselDisplay> = {
  title: "Invoices/CreateInvoice/CarouselDisplay",
  component: CarouselDisplay,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => (
      <MockInvoiceCreatorProvider scans={context.args.scans || []}>
        <div className="max-w-5xl mx-auto p-4">
          <Story />
        </div>
      </MockInvoiceCreatorProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default carousel view with multiple scans
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
 * Single scan in carousel
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
};

/**
 * Two scans - minimal carousel interaction
 */
export const TwoScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1]],
  },
};

/**
 * Large dataset to demonstrate carousel navigation
 */
export const LargeDataset: Story = {
  args: {
    scans: Array.from({length: 12}, (_, i) =>
      createMockScan(
        `scan-${i}`,
        `invoice-${String(i + 1).padStart(3, "0")}.${i % 3 === 0 ? "pdf" : "jpg"}`,
        i % 3 === 0 ? "pdf" : "image",
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
      createMockScan("4", "statement.pdf", "pdf", 0.8 * 1024 * 1024),
    ],
  },
};
