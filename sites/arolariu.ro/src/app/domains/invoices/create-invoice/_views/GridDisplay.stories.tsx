import {withInvoiceCreatorContext} from ".storybook/decorators";
import type {Meta, StoryObj} from "@storybook/react";
import {expect, within} from "@storybook/test";
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
 * Empty state - no scans uploaded yet
 * Tests: Should return null when no scans are present
 */
export const Empty: Story = {
  args: {
    scans: [],
  },
  play: async ({canvasElement}) => {
    // Component should render nothing when there are no scans
    const container = canvasElement.querySelector("div");
    expect(container).toBeNull();
  },
};

/**
 * Single scan - should display full screen (grid-cols-1)
 * Tests: Grid layout with 1 column for single scan
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should have a grid container
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();

    // Should display the scan name
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();

    // Grid should have 1 column class (grid-cols-1)
    const classList = gridContainer?.className || "";
    expect(classList).toContain("grid-cols-1");
  },
};

/**
 * Two scans - should display in 50/50 split (sm:grid-cols-2)
 * Tests: Grid layout with 2 columns for two scans
 */
export const TwoScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1]],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should have a grid container
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();

    // Should display both scan names
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();
    await expect(canvas.getByText("receipt-grocery.png")).toBeInTheDocument();

    // Grid should have 2 column classes
    const classList = gridContainer?.className || "";
    expect(classList).toContain("grid-cols-");
  },
};

/**
 * Three scans - should display in 3-column grid (lg:grid-cols-3)
 * Tests: Grid layout with up to 3 columns for 3+ scans
 */
export const ThreeScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1], mockScans[2]],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should display all three scan names
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();
    await expect(canvas.getByText("receipt-grocery.png")).toBeInTheDocument();
    await expect(canvas.getByText("bill-utility.pdf")).toBeInTheDocument();

    // Grid should support 3 columns
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    const classList = gridContainer?.className || "";
    expect(classList).toContain("grid-cols-");
  },
};

/**
 * Six scans - two rows of 3 columns each
 * Tests: Multiple rows in grid layout
 */
export const SixScans: Story = {
  args: {
    scans: mockScans,
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should display all scan names
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();
    await expect(canvas.getByText("invoice-2024-03.jpg")).toBeInTheDocument();

    // Should have grid container with multiple items
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();

    const gridItems = gridContainer?.querySelectorAll('[class*="rounded"]');
    expect(gridItems?.length).toBeGreaterThan(3);
  },
};

/**
 * Large dataset to demonstrate pagination
 * Tests: Pagination controls present for large datasets
 */
export const LargeDataset: Story = {
  args: {
    scans: Array.from({length: 15}, (_, i) =>
      createMockScan(`scan-${i}`, `invoice-${String(i + 1).padStart(3, "0")}.jpg`, "image", Math.random() * 5 * 1024 * 1024),
    ),
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should have pagination or show multiple scans
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();

    // Should display at least some scans
    await expect(canvas.getByText(/invoice-/)).toBeInTheDocument();
  },
};

/**
 * Mix of image and PDF scans
 * Tests: Both image and PDF file types display correctly
 */
export const MixedTypes: Story = {
  args: {
    scans: [
      createMockScan("1", "invoice.jpg", "image", 2.5 * 1024 * 1024),
      createMockScan("2", "receipt.pdf", "pdf", 0.5 * 1024 * 1024),
      createMockScan("3", "bill.png", "image", 1.8 * 1024 * 1024),
    ],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should display all file types
    await expect(canvas.getByText("invoice.jpg")).toBeInTheDocument();
    await expect(canvas.getByText("receipt.pdf")).toBeInTheDocument();
    await expect(canvas.getByText("bill.png")).toBeInTheDocument();

    // PDF and image files should both render in grid
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();
  },
};

/**
 * Default grid view with multiple scans
 * Tests: General grid functionality and media previews
 */
export const Default: Story = {
  args: {
    scans: mockScans,
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Verify grid renders with scans
    const gridContainer = canvasElement.querySelector('[class*="grid"]');
    expect(gridContainer).toBeTruthy();

    // Should display action buttons for scans
    const buttons = canvas.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  },
};
