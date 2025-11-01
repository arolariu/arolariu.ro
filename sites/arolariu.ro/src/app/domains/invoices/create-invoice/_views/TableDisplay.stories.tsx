import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceCreatorProvider} from "../_context/InvoiceCreatorContext";
import type {InvoiceScan} from "../_types/InvoiceScan";
import TableDisplay from "./TableDisplay";

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
    preview: `data:${blob.type};base64,mock-preview-${id}`,
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
  // Create a minimal mock of the context
  const mockContextValue = {
    scans,
    isUploading: false,
    uploadProgress: 0,
    isProcessingNext: false,
    addFiles: () => {},
    removeScan: (id: string) => console.log("Remove scan:", id),
    clearAll: () => console.log("Clear all"),
    rotateScan: async (id: string, degrees: number) => console.log("Rotate scan:", id, degrees),
    renameScan: (id: string, newName: string) => console.log("Rename scan:", id, newName),
    processNextStep: async () => console.log("Process next step"),
  };

  return <InvoiceCreatorProvider>{children}</InvoiceCreatorProvider>;
};

const meta: Meta<typeof TableDisplay> = {
  title: "Invoices/CreateInvoice/TableDisplay",
  component: TableDisplay,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => (
      <MockInvoiceCreatorProvider scans={context.args.scans || []}>
        <div className="max-w-6xl mx-auto p-4">
          <Story />
        </div>
      </MockInvoiceCreatorProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with multiple scans showing pagination and actions
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
 * Single scan in the table
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
};

/**
 * Large dataset to demonstrate pagination
 */
export const LargeDataset: Story = {
  args: {
    scans: Array.from({length: 25}, (_, i) =>
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
 * Mix of processing and idle scans
 */
export const WithProcessingScans: Story = {
  args: {
    scans: mockScans.map((scan, idx) => ({
      ...scan,
      isProcessing: idx === 1 || idx === 3,
    })),
  },
};
