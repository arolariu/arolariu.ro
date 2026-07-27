import type {Meta, StoryObj} from "@storybook/react";
import {TbLink, TbRotateClockwise, TbTrash} from "react-icons/tb";
import ScanCard from "./ScanCard";

const meta = {
  title: "Invoices/Shared/ScanCard",
  component: ScanCard,
  parameters: {layout: "centered"},
} satisfies Meta<typeof ScanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageScan: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/scancard/400/300",
      mediaKind: "image",
      alt: "grocery receipt scan",
    },
    title: "grocery-receipt-2026-06.jpg",
    metadataItems: ["1.2 MB", "Jun 8, 2026"],
    actions: [
      {key: "rotate", label: "Rotate", icon: <TbRotateClockwise />, onSelect: () => undefined},
      {key: "delete", label: "Delete", icon: <TbTrash />, onSelect: () => undefined, destructive: true},
    ],
  },
};

export const PdfScan: Story = {
  args: {
    media: {
      src: "https://example.com/invoice.pdf",
      mediaKind: "pdf",
      alt: "invoice PDF scan",
    },
    title: "invoice-scan.pdf",
    metadataItems: ["3.4 MB", "Jun 8, 2026"],
  },
};

export const Selected: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/selected-scan/400/300",
      mediaKind: "image",
      alt: "selected scan",
    },
    title: "selected-receipt.jpg",
    metadataItems: ["800 KB", "Jun 7, 2026"],
    isSelected: true,
    selection: {
      checked: true,
      onToggle: () => undefined,
      label: "Select scan",
    },
    actions: [
      {key: "delete", label: "Delete", icon: <TbTrash />, onSelect: () => undefined, destructive: true},
    ],
  },
};

export const Renaming: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/rename-scan/400/300",
      mediaKind: "image",
      alt: "scan being renamed",
    },
    title: "old-name.jpg",
    metadataItems: ["1.5 MB", "Jun 6, 2026"],
    rename: {
      value: "new-receipt-name.jpg",
      isEditing: true,
      onChange: () => undefined,
      onCommit: () => undefined,
      onCancel: () => undefined,
      placeholder: "Enter new name",
    },
  },
};

export const Uploading: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/uploading-scan/400/300",
      mediaKind: "image",
      alt: "uploading receipt scan",
    },
    title: "uploading-receipt.jpg",
    isLocked: true,
    statusBadge: (
      <span
        style={{
          borderRadius: "9999px",
          backgroundColor: "rgba(59, 130, 246, 0.9)",
          padding: "0.25rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "white",
        }}>
        Uploading
      </span>
    ),
    progress: {value: 70, label: "70%"},
  },
};

export const UploadError: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/error-scan/400/300",
      mediaKind: "image",
      alt: "failed upload scan",
    },
    title: "failed-receipt.jpg",
    metadataItems: ["2.1 MB"],
    isLocked: true,
    statusBadge: (
      <span
        style={{
          borderRadius: "9999px",
          backgroundColor: "rgba(239, 68, 68, 0.9)",
          padding: "0.25rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "white",
        }}>
        Failed
      </span>
    ),
    error: "Upload failed: Network error",
  },
};

export const LinkedToInvoice: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/linked-scan/400/300",
      mediaKind: "image",
      alt: "scan linked to invoice",
    },
    title: "invoice-attachment.jpg",
    metadataItems: ["950 KB", "Jun 5, 2026"],
    linkedBadge: (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          borderRadius: "9999px",
          backgroundColor: "rgba(59, 130, 246, 0.9)",
          padding: "0.25rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "white",
        }}>
        <TbLink style={{height: "0.75rem", width: "0.75rem"}} />
        Linked
      </div>
    ),
    actions: [
      {key: "delete", label: "Delete", icon: <TbTrash />, onSelect: () => undefined, destructive: true},
    ],
  },
};

export const ProcessingOverlay: Story = {
  args: {
    media: {
      src: "https://picsum.photos/seed/processing-scan/400/300",
      mediaKind: "image",
      alt: "scan being processed",
    },
    title: "processing-receipt.jpg",
    metadataItems: ["1.8 MB", "Jun 4, 2026"],
    isLocked: true,
    centerOverlay: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "1.5rem",
          borderRadius: "0.5rem",
        }}>
        <div
          style={{
            height: "2rem",
            width: "2rem",
            border: "3px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "9999px",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{fontSize: "0.875rem", fontWeight: 500}}>Processing...</span>
      </div>
    ),
  },
};
