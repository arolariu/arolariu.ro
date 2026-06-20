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
  title: "arolariu.ro/IMS/Components/Scan/UploadPreview",
  component: UploadPreview,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Grid of pending file uploads showing scan cards with status badges (pending, uploading, completed, failed), progress bars, thumbnails, and action buttons for remove and rotate. Paginates uploads with different page sizes for mobile (7) and desktop (50). Real component depends on `useScanUpload` hook for state management.",
      },
    },
  },
  decorators: [
    (Story) => (
      <WithScanUploadContext>
        <Story />
      </WithScanUploadContext>
    ),
  ],
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

/** Harness for seeding single file upload. */
function UploadPreviewWithSingleFile(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = [createStoryFile("receipt.jpg", "image/jpeg", 1024 * 150)];
    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/** Single file upload — minimal viable upload preview. */
export const SingleFile: Story = {
  render: () => <UploadPreviewWithSingleFile />,
  parameters: {
    docs: {
      description: {
        story: "Upload preview with single file pending. Tests sparse layout rendering between empty and multi-file states.",
      },
    },
  },
};

/** Harness for seeding many file uploads (10 files). */
function UploadPreviewWithManyFiles(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = Array.from({length: 10}, (_, i) => createStoryFile(`receipt-${i + 1}.jpg`, "image/jpeg", 1024 * (120 + i * 10)));
    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/** Many files (10) — bulk upload test. */
export const ManyFiles: Story = {
  render: () => <UploadPreviewWithManyFiles />,
  parameters: {
    docs: {
      description: {
        story: "Upload preview with 10 pending files. Tests grid layout, pagination, and rendering performance with bulk uploads.",
      },
    },
  },
};

/** Harness for seeding mixed file types (images and PDFs). */
function UploadPreviewWithMixedTypes(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = [
      createStoryFile("receipt-1.jpg", "image/jpeg", 1024 * 200),
      createStoryFile("invoice-1.pdf", "application/pdf", 1024 * 600),
      createStoryFile("receipt-2.jpg", "image/jpeg", 1024 * 180),
      createStoryFile("invoice-2.pdf", "application/pdf", 1024 * 550),
      createStoryFile("receipt-3.jpg", "image/jpeg", 1024 * 160),
    ];
    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/** Mixed file types (images and PDFs). */
export const MixedFileTypes: Story = {
  render: () => <UploadPreviewWithMixedTypes />,
  parameters: {
    docs: {
      description: {
        story: "Upload preview with mixed file types (JPEGs and PDFs). Tests rendering of different file format cards in the same grid.",
      },
    },
  },
};

/** Harness for seeding two files. */
function UploadPreviewWithTwoFiles(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = [
      createStoryFile("grocery-receipt.jpg", "image/jpeg", 1024 * 220),
      createStoryFile("restaurant-bill.pdf", "application/pdf", 1024 * 480),
    ];
    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/** Two files — minimal multi-file upload. */
export const TwoFiles: Story = {
  render: () => <UploadPreviewWithTwoFiles />,
  parameters: {
    docs: {
      description: {
        story: "Upload preview with two files (one image, one PDF). Tests minimal multi-file layout rendering.",
      },
    },
  },
};

/** Harness for seeding three files. */
function UploadPreviewWithThreeFiles(): React.JSX.Element {
  const {addFiles} = useScanUpload();

  useEffect(() => {
    const mockFiles = [
      createStoryFile("scan-1.jpg", "image/jpeg", 1024 * 195),
      createStoryFile("scan-2.jpg", "image/jpeg", 1024 * 210),
      createStoryFile("scan-3.pdf", "application/pdf", 1024 * 530),
    ];
    void addFiles(mockFiles, "input");
  }, [addFiles]);

  return <UploadPreview />;
}

/** Three files — small batch upload. */
export const ThreeFiles: Story = {
  render: () => <UploadPreviewWithThreeFiles />,
  parameters: {
    docs: {
      description: {
        story: "Upload preview with three files. Tests small batch layout and grid responsiveness.",
      },
    },
  },
};
