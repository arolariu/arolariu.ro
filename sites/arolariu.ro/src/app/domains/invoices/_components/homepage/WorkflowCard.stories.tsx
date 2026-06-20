import type {Meta, StoryObj} from "@storybook/react";
import {TbEye, TbFileInvoice, TbUpload} from "react-icons/tb";
import WorkflowCard from "./WorkflowCard";

/**
 * A single workflow step card displaying a step number badge, icon, title,
 * description, and CTA button. Used in the WorkflowSection to show
 * the 3-step invoice management process.
 * This is a pure presentational component with no translations.
 */
const meta = {
  title: "arolariu.ro/IMS/Sections/WorkflowCard",
  component: WorkflowCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof WorkflowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1 — Upload your receipt scans. */
export const UploadStep: Story = {
  args: {
    step: 1,
    title: "Upload Scans",
    description: "Take a photo of your receipt or upload an existing image. Our system supports all major formats.",
    icon: TbUpload,
    href: "/domains/invoices/upload-scans",
    buttonText: "Start Uploading",
    delay: 0,
  },
};

/** Step 2 — Review extracted data. */
export const ReviewStep: Story = {
  args: {
    step: 2,
    title: "Review Data",
    description: "Our AI extracts merchant, items, and totals. Review and confirm the extracted information.",
    icon: TbEye,
    href: "/domains/invoices/view-scans",
    buttonText: "View Scans",
    delay: 0,
  },
};

/** Step 3 — Manage your invoices. */
export const ManageStep: Story = {
  args: {
    step: 3,
    title: "Manage Invoices",
    description: "Browse, search, and analyze your invoices. Share them or export data for accounting.",
    icon: TbFileInvoice,
    href: "/domains/invoices/view-invoices",
    buttonText: "View Invoices",
    delay: 0,
  },
};

/** Upload step — dark mode. */
export const UploadStepDark: Story = {
  args: {...UploadStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Review step — dark mode. */
export const ReviewStepDark: Story = {
  args: {...ReviewStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Manage step — dark mode. */
export const ManageStepDark: Story = {
  args: {...ManageStep.args},
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Workflow card with very long title and description. */
export const LongText: Story = {
  args: {
    step: 1,
    title: "Upload Your High-Resolution Receipt Images and Document Scans for Comprehensive Analysis",
    description:
      "Take high-quality photographs of your receipts using your smartphone camera or upload existing digital images from your computer. Our advanced system supports all major image formats including JPEG, PNG, HEIC, as well as multi-page PDF documents for batch processing. The platform automatically optimizes image quality and orientation for maximum accuracy during the extraction process.",
    icon: TbUpload,
    href: "/domains/invoices/upload-scans",
    buttonText: "Start Uploading Documents Now",
    delay: 0,
  },
};

/** Workflow card with minimal text content. */
export const MinimalText: Story = {
  args: {
    step: 1,
    title: "Upload",
    description: "Quick scan upload.",
    icon: TbUpload,
    href: "/domains/invoices/upload-scans",
    buttonText: "Go",
    delay: 0,
  },
};
