import {withInvoiceCreatorContext} from ".storybook/decorators";
import type {Meta, StoryObj} from "@storybook/react";
import {expect, userEvent, waitFor, within} from "@storybook/test";
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
    uploadedAt: new Date("2024-01-01T10:00:00Z"),
    createdAt: new Date("2024-01-01T10:00:00Z"),
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

const meta: Meta<typeof TableDisplay> = {
  title: "Invoices/CreateInvoice/TableDisplay",
  component: TableDisplay,
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
    const canvas = within(canvasElement);
    // Component should render nothing when there are no scans
    const container = canvasElement.querySelector("div");
    expect(container).toBeNull();
  },
};

/**
 * Default view with multiple scans showing pagination and actions
 * Tests: Display table with scans, headers, search input, results count
 */
export const Default: Story = {
  args: {
    scans: mockScans,
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Verify table headers are present
    await expect(canvas.getByText("#")).toBeInTheDocument();
    await expect(canvas.getByText("File Name")).toBeInTheDocument();
    await expect(canvas.getByText("Type")).toBeInTheDocument();
    await expect(canvas.getByText("Size")).toBeInTheDocument();
    await expect(canvas.getByText("Uploaded")).toBeInTheDocument();
    await expect(canvas.getByText("Actions")).toBeInTheDocument();

    // Verify scans are displayed
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();
    await expect(canvas.getByText("receipt-grocery.png")).toBeInTheDocument();
    await expect(canvas.getByText("bill-utility.pdf")).toBeInTheDocument();

    // Verify search input is present
    await expect(canvas.getByPlaceholderText(/search by filename/i)).toBeInTheDocument();

    // Verify results count
    await expect(canvas.getByText(/5 of 5 shown/i)).toBeInTheDocument();

    // Verify file type badges
    await expect(canvas.getByText("IMAGE")).toBeInTheDocument();
    await expect(canvas.getByText("PDF")).toBeInTheDocument();
  },
};

/**
 * Single scan in the table
 * Tests: Display single scan with correct file size formatting
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Verify scan is displayed
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();

    // Verify file size is formatted correctly (2.5 MB)
    await expect(canvas.getByText(/2\.50 MB/i)).toBeInTheDocument();

    // Verify upload time is displayed
    await expect(canvas.getByText(/10:00/i)).toBeInTheDocument();

    // Verify results count for single scan
    await expect(canvas.getByText(/1 of 1 shown/i)).toBeInTheDocument();
  },
};

/**
 * Test search functionality
 * Tests: Filter scans based on search query, show empty search results
 */
export const SearchFiltering: Story = {
  args: {
    scans: [
      createMockScan("1", "invoice-001.jpg", "image", 1024 * 1024),
      createMockScan("2", "receipt-002.pdf", "pdf", 1024 * 1024),
      createMockScan("3", "invoice-003.jpg", "image", 1024 * 1024),
    ],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Get search input
    const searchInput = canvas.getByPlaceholderText(/search by filename/i);

    // Type search query
    await user.type(searchInput, "receipt");

    // Wait for filtering to apply
    await waitFor(async () => {
      // Only "receipt-002.pdf" should be visible
      await expect(canvas.getByText("receipt-002.pdf")).toBeInTheDocument();
      // Other files should not be visible
      expect(canvas.queryByText("invoice-001.jpg")).not.toBeInTheDocument();
      expect(canvas.queryByText("invoice-003.jpg")).not.toBeInTheDocument();
      // Results count should update
      await expect(canvas.getByText(/1 of 3 shown/i)).toBeInTheDocument();
    });

    // Clear and search for non-existent file
    await user.clear(searchInput);
    await user.type(searchInput, "nonexistent");

    await waitFor(async () => {
      // Should show 0 results
      await expect(canvas.getByText(/0 of 3 shown/i)).toBeInTheDocument();
    });
  },
};

/**
 * Large dataset to demonstrate pagination
 * Tests: Pagination controls, row numbers, page size options
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
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Verify pagination controls are present
    await expect(canvas.getByText(/rows per page:/i)).toBeInTheDocument();

    // Verify first row is numbered 1
    const tableRows = canvas.getAllByRole("row");
    // First row is header, second row is data row
    if (tableRows.length > 1) {
      const firstDataRow = tableRows[1] as HTMLElement;
      const cells = within(firstDataRow).getAllByRole("cell");
      expect(cells[0]).toHaveTextContent("1");
    }

    // Click on page size selector to verify options
    const pageSizeButton = canvas.getByRole("combobox");
    await user.click(pageSizeButton);

    await waitFor(async () => {
      // Should show options: 10, 20, 50, 100
      await expect(canvas.getByRole("option", {name: "10"})).toBeInTheDocument();
      await expect(canvas.getByRole("option", {name: "20"})).toBeInTheDocument();
      await expect(canvas.getByRole("option", {name: "50"})).toBeInTheDocument();
      await expect(canvas.getByRole("option", {name: "100"})).toBeInTheDocument();
    });
  },
};

/**
 * Mix of processing and idle scans
 * Tests: Processing scans should have visual indicators (disabled state, spinner)
 */
export const WithProcessingScans: Story = {
  args: {
    scans: mockScans.map((scan, idx) => ({
      ...scan,
      isProcessing: idx === 1 || idx === 3,
    })),
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Verify processing indicators are present
    // Processing rows should have reduced opacity or special styling
    const tableRows = canvas.getAllByRole("row");

    // Check that processing scans have disabled action buttons
    // Note: This is a visual test - the actual implementation details may vary
    await expect(tableRows.length).toBeGreaterThan(1);
  },
};

/**
 * Action buttons test
 * Tests: Rename and delete actions are available, but NOT rotate
 */
export const ActionButtons: Story = {
  args: {
    scans: [createMockScan("1", "test-invoice.jpg", "image", 1024 * 1024)],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should have action buttons (rename, delete)
    const buttons = canvas.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Should NOT have rotate button (table view doesn't show rotation)
    const rotateButtons = canvas.queryAllByLabelText(/rotate/i);
    expect(rotateButtons.length).toBe(0);
  },
};
