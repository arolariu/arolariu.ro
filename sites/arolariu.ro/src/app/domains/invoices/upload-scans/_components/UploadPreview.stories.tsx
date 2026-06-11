import type {Meta, StoryObj} from "@storybook/react";
import {WithScanUploadContext} from "../../_storybook";
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
 * Empty state — no uploads pending.
 * Real component returns null when pendingUploads array is empty.
 */
export const EmptyState: Story = {};
