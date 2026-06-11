import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {createStoryFile, WithScanUploadContext} from "../../_storybook";
import {useScanUpload} from "../_context/ScanUploadContext";
import UploadPreview from "./UploadPreview";

/**
 * UploadPreview displays a grid of pending file uploads with status indicators,
 * progress bars, and remove buttons.
 *
 * @remarks Component depends on `useScanUpload` hook from ScanUploadContext
 * for managing upload state, progress tracking, file rotation, and removal.
 * Stories use WithScanUploadContext provider to supply the required context.
 */
const meta = {
  title: "Invoices/UploadScans/UploadPreview",
  component: UploadPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Grid of pending file uploads showing scan cards with status badges (pending, uploading, completed, failed), progress bars, thumbnails, and action buttons for remove and rotate. Paginates uploads with different page sizes for mobile (7) and desktop (50). Real component depends on `useScanUpload` hook for state management.",
      },
    },
  },
  decorators: [(Story) => <WithScanUploadContext><Story /></WithScanUploadContext>],
} satisfies Meta<typeof UploadPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Harness component that seeds files into the upload context before rendering UploadPreview.
 */
function UploadPreviewWithFiles(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = [
      createStoryFile("grocery-receipt-2024-03-15.jpg", "image/jpeg", 1024 * 240),
      createStoryFile("restaurant-bill-2024-03-14.jpg", "image/jpeg", 1024 * 180),
      createStoryFile("invoice-2024-03-13.pdf", "application/pdf", 1024 * 500),
      createStoryFile("pharmacy-receipt.jpg", "image/jpeg", 1024 * 120),
    ];

    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/**
 * Upload preview with pending files seeded via context.
 * Shows 4 mock scans ready for upload with real ScanCard components.
 */
export const WithPendingFiles: Story = {
  render: () => <UploadPreviewWithFiles />,
  parameters: {
    docs: {
      description: {
        story:
          "Upload preview grid showing 4 pending files: two JPEG receipts, one PDF invoice, and one pharmacy receipt. Files are seeded via `addFiles()` from the real ScanUploadContext. Each card shows thumbnail, file size, and remove/rotate actions.",
      },
    },
  },
};

/**
 * Empty state — no uploads pending.
 * Real component returns null when pendingUploads array is empty.
 */
export const EmptyState: Story = {
  parameters: {
    docs: {
      description: {
        story: "No pending uploads in the real ScanUploadContext; UploadPreview intentionally renders nothing.",
      },
    },
  },
};
