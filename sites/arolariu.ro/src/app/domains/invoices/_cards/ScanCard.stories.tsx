/**
 * @fileoverview Storybook stories for ScanCard component.
 * @module app/domains/invoices/_cards/ScanCard.stories
 */

import {storyImageScanUrl, storyPdfScanUrl} from "@/app/domains/invoices/_storybook";
import {logStoryAction} from "@/app/domains/invoices/_storybook/utils/storyActions";
import {Badge, Card, Spinner} from "@arolariu/components";
import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {TbLink, TbRotateClockwise, TbTrash} from "react-icons/tb";
import ScanCard from "./ScanCard";

const meta = {
  title: "arolariu.ro/IMS/Cards/Scan/ScanCard",
  component: ScanCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays a receipt scan thumbnail with title, metadata, optional status badge, progress indicator, linked badge, center overlay, actions menu, and rename capability. Supports image and PDF media types with preview activation.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Image scan with action menu.
 */
export const ImageWithActions: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Grocery receipt scan",
      onPreviewActivate: () => {
        logStoryAction("Preview activated");
      },
    },
    title: "grocery-receipt-2024-03-15.jpg",
    metadataItems: ["240 KB", "Mar 15, 2024"],
    actions: [
      {
        key: "rotate",
        label: "Rotate",
        icon: <TbRotateClockwise />,
        onSelect: () => {
          logStoryAction("Rotate scan");
        },
      },
      {
        key: "delete",
        label: "Delete",
        icon: <TbTrash />,
        onSelect: () => {
          logStoryAction("Delete scan");
        },
        destructive: true,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Image scan card with clickable preview activation and kebab menu actions (rotate, delete). Clicking the thumbnail triggers preview callback/action (logged in story); use the actions menu for rotate and delete operations.",
      },
    },
  },
};

/**
 * PDF scan selected variant.
 */
export const PdfSelected: Story = {
  args: {
    media: {
      src: storyPdfScanUrl,
      mediaKind: "pdf",
      alt: "Invoice PDF scan",
      onPreviewActivate: () => {
        logStoryAction("PDF preview activated");
      },
    },
    title: "invoice-2024-03-15.pdf",
    metadataItems: ["500 KB", "Mar 15, 2024", "2 pages"],
    isSelected: true,
    selection: {
      checked: true,
      onToggle: () => {
        logStoryAction("Toggle selection");
      },
      label: "Select scan",
    },
    actions: [
      {
        key: "delete",
        label: "Delete",
        icon: <TbTrash />,
        onSelect: () => {
          logStoryAction("Delete PDF scan");
        },
        destructive: true,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "PDF scan card in selected state with visible checkbox and delete action. Shows PDF file icon placeholder, multi-metadata line (size, date, page count), and selection highlight. Checkbox toggles selection state.",
      },
    },
  },
};

/**
 * Scan card with upload progress.
 */
export const UploadProgress: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Uploading receipt scan",
    },
    title: "uploading-receipt.jpg",
    isLocked: true,
    statusBadge: <Badge variant='default'>Uploading</Badge>,
    progress: {value: 70, label: "70% uploaded"},
  },
  parameters: {
    docs: {
      description: {
        story:
          "Scan card during upload with linear progress bar at 70%, blue 'Uploading' status badge (Badge primitive with default variant), and locked state (no interactions). Progress indicator shows percentage below the card.",
      },
    },
  },
};

/**
 * Scan card in rename editing mode with state.
 * Uses a small harness component to demonstrate rename state management.
 */
export const RenameEditing: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan being renamed",
    },
    title: "old-receipt-name.jpg",
  },
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Storybook render function is equivalent to a component
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Storybook render function is equivalent to a component
    const [value, setValue] = useState("old-receipt-name.jpg");

    return (
      <ScanCard
        media={{
          src: storyImageScanUrl,
          mediaKind: "image",
          alt: "Scan being renamed",
        }}
        title={value}
        metadataItems={["1.5 MB", "Mar 14, 2024"]}
        rename={{
          value,
          isEditing,
          onStart: () => {
            setIsEditing(true);
            logStoryAction("Start rename");
          },
          onChange: (newValue: string) => {
            setValue(newValue);
            logStoryAction(`Rename value changed: ${newValue}`);
          },
          onCommit: () => {
            setIsEditing(false);
            logStoryAction(`Rename committed: ${value}`);
          },
          onCancel: () => {
            setIsEditing(false);
            setValue("old-receipt-name.jpg");
            logStoryAction("Rename cancelled");
          },
          placeholder: "Enter new name",
        }}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Inline rename editing with controlled state harness. Double-click title or click pencil button to enter edit mode; input field replaces title with commit/cancel controls. Demonstrates rename lifecycle: onStart → onChange → onCommit/onCancel.",
      },
    },
  },
};

/**
 * Scan linked to invoice with badge.
 */
export const LinkedToInvoice: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan linked to invoice",
    },
    title: "invoice-attachment.jpg",
    metadataItems: ["950 KB", "Mar 13, 2024"],
    linkedBadge: (
      <Badge
        variant='default'
        className='flex items-center gap-1'>
        <TbLink className='h-3 w-3' />
        Linked
      </Badge>
    ),
    actions: [
      {
        key: "delete",
        label: "Delete",
        icon: <TbTrash />,
        onSelect: () => {
          logStoryAction("Delete linked scan");
        },
        destructive: true,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Scan card with top-left 'Linked' badge (Badge primitive with default variant) indicating attachment to an existing invoice. Badge includes link icon and uses @arolariu/components styling. Card remains interactive with delete action available.",
      },
    },
  },
};

/**
 * Upload failed with error message.
 */
export const UploadError: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Failed upload scan",
    },
    title: "failed-receipt.jpg",
    metadataItems: ["2.1 MB"],
    isLocked: true,
    statusBadge: <Badge variant='destructive'>Failed</Badge>,
    error: "Upload failed: Network error",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Error state showing failed upload with red 'Failed' badge (Badge primitive with destructive variant), error message below card, and locked state. Error text displays diagnostic message (e.g., 'Upload failed: Network error').",
      },
    },
  },
};

/**
 * Scan with center processing overlay.
 */
export const ProcessingOverlay: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan being processed",
    },
    title: "processing-receipt.jpg",
    metadataItems: ["1.8 MB", "Mar 12, 2024"],
    isLocked: true,
    centerOverlay: (
      <Card className='flex flex-col items-center gap-2 bg-background/95 p-6 shadow-md'>
        <Spinner />
        <span className='text-sm font-medium text-foreground'>Processing...</span>
      </Card>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Scan card with centered processing overlay covering the thumbnail. Displays animated spinner with 'Processing...' label using Card primitive from @arolariu/components. Card is locked during processing.",
      },
    },
  },
};

/** Scan card with very long filename. */
export const LongFilename: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan with long filename",
    },
    title: "grocery-receipt-corner-shop-bucuresti-militari-branch-daily-shopping-trip-march-2024-final-version-compressed.jpg",
    metadataItems: ["450 KB", "Mar 16, 2024"],
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with extremely long filename to verify title truncation, wrapping, and tooltip display behavior.",
      },
    },
  },
};

/** Scan card with minimal metadata. */
export const MinimalMetadata: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan with minimal metadata",
    },
    title: "scan.jpg",
    metadataItems: [],
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with no metadata items — tests layout when metadata section is empty.",
      },
    },
  },
};

/** Scan card with many metadata items. */
export const ManyMetadataItems: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan with many metadata items",
    },
    title: "detailed-scan.jpg",
    metadataItems: ["2.5 MB", "1920x1080", "Mar 17, 2024", "JPEG", "sRGB", "100% Quality"],
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with 6 metadata items to verify overflow handling and spacing.",
      },
    },
  },
};

/** Scan card without any actions. */
export const NoActions: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan without actions",
    },
    title: "readonly-scan.jpg",
    metadataItems: ["1.2 MB", "Mar 18, 2024"],
    actions: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card without actions menu to test read-only state.",
      },
    },
  },
};

/** Scan card selected but not checkable. */
export const SelectedNoCheckbox: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Selected scan",
    },
    title: "selected-scan.jpg",
    metadataItems: ["800 KB", "Mar 19, 2024"],
    isSelected: true,
    selection: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card in selected state without checkbox UI (selection prop undefined).",
      },
    },
  },
};

/** Scan card with locked state. */
export const LockedState: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Locked scan",
    },
    title: "locked-scan.jpg",
    metadataItems: ["1.5 MB", "Mar 20, 2024"],
    isLocked: true,
    statusBadge: <Badge variant='secondary'>Locked</Badge>,
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card in locked state with secondary status badge.",
      },
    },
  },
};

/** Scan card with zero progress. */
export const ZeroProgress: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan with zero progress",
    },
    title: "starting-upload.jpg",
    metadataItems: ["2.0 MB"],
    progress: {value: 0, label: "Starting upload..."},
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with progress bar at 0% to test upload start state.",
      },
    },
  },
};

/** Scan card with 50% progress. */
export const HalfProgress: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan at half progress",
    },
    title: "half-upload.jpg",
    metadataItems: ["1.8 MB"],
    progress: {value: 50, label: "50% uploaded"},
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with progress bar at 50% to test mid-upload state.",
      },
    },
  },
};

/** Scan card with complete progress. */
export const CompleteProgress: Story = {
  args: {
    media: {
      src: storyImageScanUrl,
      mediaKind: "image",
      alt: "Scan upload complete",
    },
    title: "complete-upload.jpg",
    metadataItems: ["1.5 MB", "Mar 21, 2024"],
    progress: {value: 100, label: "Upload complete"},
    statusBadge: <Badge variant='default'>Complete</Badge>,
  },
  parameters: {
    docs: {
      description: {
        story: "Scan card with progress bar at 100% and success badge.",
      },
    },
  },
};
