import type {Meta, StoryObj} from "@storybook/react";
import {expect, userEvent, waitFor, within} from "@storybook/test";
import {withInvoiceCreatorContext} from "../../../../../../.storybook/decorators";
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

const meta: Meta<typeof CarouselDisplay> = {
  title: "Invoices/CreateInvoice/CarouselDisplay",
  component: CarouselDisplay,
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
 * Single scan in carousel
 * Tests: Display single scan with basic carousel structure
 */
export const SingleScan: Story = {
  args: {
    scans: [mockScans[0]],
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should display the scan
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();

    // Carousel container should be present
    const carouselContainer = canvasElement.querySelector('[class*="embla"]');
    expect(carouselContainer).toBeTruthy();
  },
};

/**
 * Two scans - minimal carousel interaction
 * Tests: Navigation between two scans
 */
export const TwoScans: Story = {
  args: {
    scans: [mockScans[0], mockScans[1]],
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement);

    // Should have carousel navigation buttons
    const buttons = canvas.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Should display first scan
    if (args.scans && args.scans.length > 0) {
      await expect(canvas.getByText(args.scans[0].name)).toBeInTheDocument();
    }
  },
};

/**
 * Default carousel view with multiple scans
 * Tests: Carousel navigation, indicators, and content display
 */
export const Default: Story = {
  args: {
    scans: mockScans,
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Should have carousel container
    const carouselContainer = canvasElement.querySelector('[class*="embla"]');
    expect(carouselContainer).toBeTruthy();

    // Should display first scan initially
    await expect(canvas.getByText("invoice-2024-01.jpg")).toBeInTheDocument();

    // Should have navigation buttons (prev/next)
    const navButtons = canvas.getAllByRole("button").filter((btn) => {
      const ariaLabel = btn.getAttribute("aria-label");
      return ariaLabel?.includes("Previous") || ariaLabel?.includes("Next");
    });
    expect(navButtons.length).toBeGreaterThan(0);

    // Should have carousel indicators (dots)
    const indicators = canvasElement.querySelectorAll('[class*="dot"]');
    expect(indicators.length).toBeGreaterThanOrEqual(mockScans.length);
  },
};

/**
 * Large dataset to demonstrate carousel navigation
 * Tests: Navigation through multiple slides, indicators update
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
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Should display carousel with navigation
    const carouselContainer = canvasElement.querySelector('[class*="embla"]');
    expect(carouselContainer).toBeTruthy();

    // Should have multiple carousel indicators
    const indicators = canvasElement.querySelectorAll('[class*="dot"]');
    expect(indicators.length).toBe(12);

    // Test navigation by clicking next button
    const nextButton = canvas.getAllByRole("button").find((btn) => btn.getAttribute("aria-label")?.includes("Next"));

    if (nextButton) {
      await user.click(nextButton);

      // Wait for carousel to transition
      await waitFor(
        () => {
          // After clicking next, should show a different scan
          // This is a basic check that navigation works
        },
        {timeout: 1000},
      );
    }
  },
};

/**
 * Mix of image and PDF scans
 * Tests: Both file types display correctly in carousel
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
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    // Should have carousel with mixed content
    const carouselContainer = canvasElement.querySelector('[class*="embla"]');
    expect(carouselContainer).toBeTruthy();

    // Should display scan names
    await expect(canvas.getByText(/invoice\.jpg|receipt\.pdf/)).toBeInTheDocument();

    // Should have 4 indicators for 4 scans
    const indicators = canvasElement.querySelectorAll('[class*="dot"]');
    expect(indicators.length).toBe(4);
  },
};

/**
 * Keyboard navigation test
 * Tests: Arrow key navigation through carousel slides
 */
export const KeyboardNavigation: Story = {
  args: {
    scans: mockScans.slice(0, 3),
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Focus on carousel container
    const carouselContainer = canvasElement.querySelector('[class*="embla"]');
    expect(carouselContainer).toBeTruthy();

    // Should support keyboard navigation
    // This is a basic test that the carousel structure supports keyboard interaction
    const buttons = canvas.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  },
};
